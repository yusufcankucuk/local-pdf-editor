import { orderOverlay as reorderOverlays } from "./model";
import type { ContentTarget } from "../../lib/contentTypes";
import { useEffect, useReducer, useRef, useState } from "react";
import type { DocumentSession } from "../document/useDocument";
import { historyReducer, movePage } from "./model";
import type { EditorPage, Overlay } from "./model";
import type { RequestPassword } from "../../lib/pdf";
import { openPdf } from "../../lib/pdf";
import { downloadBlob } from "../../lib/download";
import type { PageSource } from "../../lib/exportPdf";

export function useEditor(
  document: DocumentSession,
  requestPassword: RequestPassword,
) {
  const initial = useRef<EditorPage[]>(
    Array.from({ length: document.pdf.numPages }, (_, index) => ({
      id: `original-${index}`,
      sourceId: "original",
      sourcePage: index + 1,
      rotation: 0,
      overlays: [],
    })),
  );
  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initial.current,
    future: [],
  });
  const sources = useRef(new Map<string, PageSource>([["original", document]]));
  const [saved, setSaved] = useState(initial.current);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const alive = useRef(true);
  const pages = history.present;
  const modified = pages !== initial.current;
  const dirty = pages !== saved;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      for (const [id, source] of sources.current)
        if (id !== "original") void source.pdf.loadingTask.destroy();
    };
  }, []);
  useEffect(() => {
    function guard(event: BeforeUnloadEvent) {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  function commit(next: EditorPage[]) {
    dispatch({ type: "commit", pages: next });
    setMessage("");
  }
  function updatePage(index: number, update: (page: EditorPage) => EditorPage) {
    commit(pages.map((page, at) => (at === index ? update(page) : page)));
  }
  function rotate(index: number) {
    updatePage(index, (page) => ({
      ...page,
      rotation: (page.rotation + 90) % 360,
    }));
  }
  function remove(index: number) {
    if (pages.length > 1) commit(pages.filter((_, at) => at !== index));
  }
  function duplicate(index: number) {
    const next = [...pages];
    next.splice(index + 1, 0, { ...pages[index], id: crypto.randomUUID() });
    commit(next);
  }
  async function blank(index: number) {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      if (!sources.current.has("blank")) {
        const { createBlankPdf } = await import("../../lib/exportPdf");
        const file = await createBlankPdf();
        const { pdf } = await openPdf(file);
        if (!alive.current) {
          await pdf.loadingTask.destroy();
          return false;
        }
        sources.current.set("blank", { file, pdf });
      }
      const next = [...pages];
      next.splice(index + 1, 0, {
        id: crypto.randomUUID(),
        sourceId: "blank",
        sourcePage: 1,
        rotation: 0,
        overlays: [],
      });
      commit(next);
      return true;
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof Error ? cause.message : "Boş sayfa eklenemedi.",
        );
      return false;
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function setFormValue(index: number, name: string, value: string | boolean) {
    const sourceId = pages[index].sourceId;
    commit(
      pages.map((page) =>
        page.sourceId === sourceId
          ? {
              ...page,
              overlays: [
                ...page.overlays.filter(
                  (item) => item.kind !== "form" || item.name !== name,
                ),
                { id: `form-${name}`, kind: "form", name, value },
              ],
            }
          : page,
      ),
    );
  }
  function replaceContent(index: number, target: ContentTarget) {
    const overlay = {
      ...target.overlay,
      id: crypto.randomUUID(),
      ...(target.overlay.kind === "image" && target.removal.kind === "image"
        ? { native: { id: target.removal.id, data: target.overlay.data } }
        : {}),
    };
    updatePage(index, (page) => ({
      ...page,
      removals: [...(page.removals ?? []), target.removal],
      overlays: [...page.overlays, overlay],
    }));
    return overlay.id;
  }
  function updateOverlay(index: number, overlay: Overlay) {
    updatePage(index, (page) => ({
      ...page,
      overlays: page.overlays.map((item) =>
        item.id === overlay.id ? overlay : item,
      ),
    }));
  }
  function orderOverlay(index: number, id: string, direction: -1 | 1) {
    const existing = pages[index].overlays;
    const selected = existing.find((item) => item.id === id);
    if (selected?.kind === "image" && selected.native) return;
    const native = existing.filter(
      (item) => item.kind === "image" && item.native,
    );
    const added = existing.filter(
      (item) => !(item.kind === "image" && item.native),
    );
    const reordered = reorderOverlays(added, id, direction);
    if (reordered === added) return;
    const next = [...native, ...reordered];
    updatePage(index, (page) => ({ ...page, overlays: next }));
  }
  function removeOverlay(index: number, id: string) {
    updatePage(index, (page) => ({
      ...page,
      overlays: page.overlays.filter((item) => item.id !== id),
    }));
  }
  function annotate(index: number, overlay: Overlay) {
    updatePage(index, (page) => ({
      ...page,
      overlays: [...page.overlays, overlay],
    }));
  }
  async function merge(file: File) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const { pdf, encrypted } = await openPdf(file, requestPassword);
      if (encrypted) {
        await pdf.loadingTask.destroy();
        throw new Error(
          "Şifreli PDF birleştirilemiyor. Şifresiz bir kopya seçin.",
        );
      }
      if (!alive.current) {
        await pdf.loadingTask.destroy();
        return;
      }
      const id = crypto.randomUUID();
      sources.current.set(id, { pdf, file });
      commit([
        ...pages,
        ...Array.from({ length: pdf.numPages }, (_, index) => ({
          id: crypto.randomUUID(),
          sourceId: id,
          sourcePage: index + 1,
          rotation: 0,
          overlays: [],
        })),
      ]);
      setMessage(`${pdf.numPages} sayfa belgeye eklendi.`);
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof Error ? cause.message : "PDF birleştirilemedi.",
        );
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function prepareFile(onlyPage?: number) {
    if (!modified && onlyPage === undefined) return document.file;
    const { exportPdf } = await import("../../lib/exportPdf");
    const selected = onlyPage === undefined ? pages : [pages[onlyPage]];
    const bytes = await exportPdf(selected, sources.current);
    const name = document.file.name.replace(/\.pdf$/i, "");
    const filename =
      onlyPage === undefined
        ? `${name}-duzenlenmis.pdf`
        : `${name}-sayfa-${onlyPage + 1}.pdf`;
    const file = new File([bytes.slice().buffer], filename, {
      type: "application/pdf",
    });
    const { pdf: verification } = await openPdf(file);
    const count = verification.numPages;
    await verification.loadingTask.destroy();
    if (count !== selected.length)
      throw new Error("Çıktının sayfa sayısı doğrulanamadı.");
    return file;
  }
  async function download(onlyPage?: number) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const file = await prepareFile(onlyPage);
      if (alive.current) {
        downloadBlob(file, file.name);
        if (onlyPage === undefined) setSaved(pages);
        setMessage("PDF indirildi. Orijinal dosyanız korundu.");
      }
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : "PDF indirilemedi.");
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function printView() {
    if (busyRef.current) return;
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      setError(
        "Yazdırma görünümü açılamadı. Tarayıcınızda bu site için açılır pencerelere izin verin veya PDF’i indirip açın.",
      );
      return;
    }
    popup.opener = null;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const file = await prepareFile();
      if (!alive.current) {
        popup.close();
        return;
      }
      const url = URL.createObjectURL(file);
      popup.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 120000);
      setMessage(
        "Yazdırma görünümü açıldı. Yeni penceredeki yazdır simgesini kullanın.",
      );
    } catch (cause) {
      popup.close();
      if (alive.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Yazdırma görünümü açılamadı.",
        );
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return {
    pages,
    sources: sources.current,
    dirty,
    modified,
    busy,
    error,
    message,
    clearError: () => setError(""),
    rotate,
    remove,
    duplicate,
    blank,
    annotate,
    replaceContent,
    updateOverlay,
    setFormValue,
    removeOverlay,
    orderOverlay,
    move: (from: number, to: number) => commit(movePage(pages, from, to)),
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    merge,
    download,
    printView,
  };
}
