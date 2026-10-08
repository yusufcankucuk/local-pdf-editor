import * as mupdf from "mupdf";
import { readContentPage, eraseContentPage } from "./contentEngine";
import type { ContentRemoval } from "./contentTypes";
self.onmessage = (
  event: MessageEvent<{
    id: number;
    operation: "read" | "erase" | "preview";
    bytes: ArrayBuffer;
    page: number;
    removals: ContentRemoval[];
  }>,
) => {
  const { id, operation, bytes, page, removals } = event.data;
  let pdf: mupdf.PDFDocument | undefined;
  try {
    pdf = new mupdf.PDFDocument(bytes);
    const result =
      operation === "read"
        ? readContentPage(pdf, page)
        : eraseContentPage(pdf, page, removals, operation === "preview");
    self.postMessage(
      { id, result },
      { transfer: result instanceof Uint8Array ? [result.buffer] : [] },
    );
  } catch {
    self.postMessage({
      id,
      error: "Bu sayfanın içeriği düzenlenemedi. Orijinal belge korundu.",
    });
  } finally {
    pdf?.destroy();
  }
};
// WASM initialization uses top-level await; acknowledge readiness before accepting work.
self.postMessage({ ready: true });
