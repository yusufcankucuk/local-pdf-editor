import { imageRemovals } from "../../lib/contentTypes";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PageSource } from "../../lib/exportPdf";
import type { EditorPage } from "./model";
import type { ContentTarget } from "../../lib/contentTypes";
import { readContent, contentPreview } from "../../lib/contentPdf";
import { openPdf } from "../../lib/pdf";
export function useNativeContent(
  source: PageSource | undefined | null,
  entry: EditorPage,
  enabled: boolean,
) {
  const [result, setResult] = useState<{
    file: File;
    page: number;
    targets: ContentTarget[];
  } | null>(null);
  const [preview, setPreview] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled || !source) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setResult(null);
    void readContent(source.file, entry.sourcePage)
      .then((items) => {
        if (!cancelled)
          setResult({
            file: source.file,
            page: entry.sourcePage,
            targets: items,
          });
      })
      .catch(() => {
        if (!cancelled)
          setError("Bu sayfanın içeriği okunamadı. Orijinal belge korundu.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, entry.sourcePage, enabled]);
  // Text/shape updates do not require reparsing the source PDF preview.
  const nativeImages = entry.overlays.filter(
    (item) => item.kind === "image" && item.native,
  );
  const cachedEdits = useRef<{
    removals: EditorPage["removals"];
    images: EditorPage["overlays"];
    edits: ReturnType<typeof imageRemovals>;
  } | null>(null);
  if (
    !cachedEdits.current ||
    cachedEdits.current.removals !== entry.removals ||
    cachedEdits.current.images.length !== nativeImages.length ||
    nativeImages.some(
      (image, index) => image !== cachedEdits.current!.images[index],
    )
  ) {
    cachedEdits.current = {
      removals: entry.removals,
      images: nativeImages,
      edits: imageRemovals(entry.removals, entry.overlays),
    };
  }
  const edits = cachedEdits.current.edits;
  const [appliedEdits, setAppliedEdits] = useState<typeof edits | null>(null);
  useEffect(() => {
    let cancelled = false;
    let owned: PDFDocumentProxy | null = null;
    setPreview(null);
    setError("");
    if (source && entry.removals?.length) {
      void (async () => {
        const bytes = await contentPreview(
          await source.file.arrayBuffer(),
          entry.sourcePage,
          edits,
        );
        const result = await openPdf(
          new File([bytes.buffer], "preview.pdf", { type: "application/pdf" }),
        );
        owned = result.pdf;
        if (cancelled) {
          await owned.loadingTask.destroy();
          owned = null;
          return;
        }
        setPreview(owned);
        setAppliedEdits(edits);
      })().catch(() => {
        if (!cancelled)
          setError(
            "İçerik önizlemesi hazırlanamadı; indirmeden önce düzenlemeyi geri alın.",
          );
      });
    }
    return () => {
      cancelled = true;
      void owned?.loadingTask.destroy();
    };
  }, [source, entry.sourcePage, edits]);
  return {
    pdf: preview ?? source?.pdf,
    page: preview ? 1 : entry.sourcePage,
    targets: (result?.file === source?.file && result?.page === entry.sourcePage
      ? result.targets
      : []
    ).filter(
      (target) => !entry.removals?.some((removal) => removal.id === target.id),
    ),
    pending: !!source && !!entry.removals?.length && appliedEdits !== edits,
    loading,
    error,
  };
}
