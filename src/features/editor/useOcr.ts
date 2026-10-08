import { useEffect, useRef, useState } from "react";
import type { PageSource } from "../../lib/exportPdf";
import type { EditorPage } from "./model";
import type { ContentTarget } from "../../lib/contentTypes";
import { defaultOcrOptions } from "../../lib/ocrOptions";
import type { OcrOptions, OcrSelection, PdfRect } from "../../lib/ocrOptions";
export function useOcr(
  source: PageSource | null | undefined,
  entry: EditorPage,
) {
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [options, setOptions] = useState<OcrOptions>(defaultOcrOptions);
  const [selection, setSelection] = useState<OcrSelection>("paragraph");
  const [region, setRegion] = useState<PdfRect | undefined>();
  const [result, setResult] = useState<{
    file: File;
    page: number;
    targets: Record<OcrSelection, ContentTarget[]> & {
      background?: [number, number, number];
    };
  } | null>(null);
  useEffect(() => {
    setResult(null);
    setRegion(undefined);
    setBusy(false);
    setMessage("");
    setError("");
    return () => {
      active.current?.abort();
      active.current = null;
    };
  }, [source, entry.id, entry.sourcePage]);
  async function recognize(area?: PdfRect) {
    if (!source || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    setRegion(area);
    setResult(null);
    try {
      const { recognizePage } = await import("../../lib/ocr");
      const targets = await recognizePage(
        source.pdf,
        entry.sourcePage,
        controller.signal,
        setMessage,
        options,
        area,
      );
      if (controller.signal.aborted) return;
      setResult({ file: source.file, page: entry.sourcePage, targets });
      setMessage(
        targets.paragraph.length
          ? `${targets.paragraph.length} metin bloğu bulundu. Paragraf, satır veya kelime seçerek düzeltin.`
          : "Okunabilir metin bulunamadı. Analiz düzenini veya yazı yönünü değiştirin; seçili alanı elle de yazabilirsiniz.",
      );
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Yazı tanınamadı.");
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  function cancel() {
    active.current?.abort();
    active.current = null;
    setBusy(false);
    setMessage("Yazı tanıma iptal edildi. Belge değiştirilmedi.");
  }
  function unchanged(target: ContentTarget) {
    return !entry.removals?.some((removal) =>
      (removal.rects ?? [removal.rect]).some((rect) =>
        (target.removal.rects ?? [target.bounds]).some(
          (area) =>
            Math.min(area[2], rect[2]) > Math.max(area[0], rect[0]) &&
            Math.min(area[3], rect[3]) > Math.max(area[1], rect[1]),
        ),
      ),
    );
  }
  const matching =
    result?.file === source?.file && result?.page === entry.sourcePage;
  const targets = matching ? result.targets[selection].filter(unchanged) : [];
  const paragraphs = matching ? result.targets.paragraph.filter(unchanged) : [];
  const combined: ContentTarget | undefined =
    region && paragraphs.length
      ? {
          ...paragraphs[0],
          id: `combined-${paragraphs[0].id}`,
          bounds: [
            Math.min(...paragraphs.map((t) => t.bounds[0])),
            Math.min(...paragraphs.map((t) => t.bounds[1])),
            Math.max(...paragraphs.map((t) => t.bounds[2])),
            Math.max(...paragraphs.map((t) => t.bounds[3])),
          ],
          hitRects: paragraphs.flatMap((t) => t.hitRects ?? [t.bounds]),
          removal: {
            ...paragraphs[0].removal,
            id: `combined-${paragraphs[0].id}`,
            rects: paragraphs.flatMap((t) => t.removal.rects ?? [t.bounds]),
            fillColors: paragraphs.every((t) => t.removal.fillColors)
              ? paragraphs.flatMap((t) => t.removal.fillColors!)
              : undefined,
          },
          overlay:
            paragraphs[0].overlay.kind === "text"
              ? {
                  ...paragraphs[0].overlay,
                  text: paragraphs
                    .map((t) =>
                      t.overlay.kind === "text" ? t.overlay.text : "",
                    )
                    .join("\n"),
                }
              : paragraphs[0].overlay,
        }
      : undefined;
  let manual: ContentTarget | undefined;
  if (region) {
    const size = 12,
      [x0, y0, x1, y1] = region;
    const origin =
      options.rotation === 90
        ? [x0 + size, y0]
        : options.rotation === 180
          ? [x1, y0 + size]
          : options.rotation === 270
            ? [x1 - size, y1]
            : [x0, y1 - size];
    const id = `manual-${entry.id}-${region.join("-")}`;
    manual = {
      id,
      bounds: region,
      removal: {
        id,
        kind: "scan",
        rect: region,
        fillColors: result?.targets.background
          ? [result.targets.background]
          : undefined,
      },
      overlay: {
        id,
        kind: "text",
        x: origin[0],
        y: origin[1],
        text: "Yeni metin",
        font: "serif",
        size,
        color: "#222222",
        textWidth: Math.max(20, options.rotation % 180 ? y1 - y0 : x1 - x0),
        rotation: options.rotation,
      },
    };
    if (!unchanged(manual)) manual = undefined;
  }
  return {
    busy,
    message,
    error,
    recognize,
    cancel,
    options,
    setOptions,
    selection,
    setSelection,
    targets,
    combined,
    manual,
    region,
  };
}
