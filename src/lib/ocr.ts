import { defaultOcrOptions, enhanceScan, paperColor } from "./ocrOptions";
import type { OcrOptions, PdfRect, OcrSelection } from "./ocrOptions";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { ocrTargets } from "./ocrLayout";
import type { OcrParagraph } from "./ocrLayout";
export async function recognizePage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  signal: AbortSignal,
  progress: (message: string) => void,
  options: OcrOptions = defaultOcrOptions,
  region?: PdfRect,
) {
  signal.throwIfAborted();
  const page = await pdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1, rotation: options.rotation });
  const corners = region
    ? [
        base.convertToViewportPoint(region[0], region[1]),
        base.convertToViewportPoint(region[2], region[3]),
      ]
    : [
        [0, 0],
        [base.width, base.height],
      ];
  const left = Math.max(0, Math.min(...corners.map((p) => p[0]))),
    top = Math.max(0, Math.min(...corners.map((p) => p[1])));
  const width =
      Math.min(base.width, Math.max(...corners.map((p) => p[0]))) - left,
    height = Math.min(base.height, Math.max(...corners.map((p) => p[1]))) - top;
  if (!Number.isFinite(width + height) || width < 2 || height < 2)
    throw new Error("Daha büyük bir yazı alanı seçin.");
  const border = region ? 8 : 0;
  const scale = Math.min(
    region ? 6 : 4.1667,
    Math.sqrt(12_000_000 / ((width + border * 2) * (height + border * 2))),
    10000 / (width + border * 2),
    10000 / (height + border * 2),
  );
  const viewport = page.getViewport({ scale, rotation: options.rotation });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil((width + border * 2) * scale);
  canvas.height = Math.ceil((height + border * 2) * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Sayfa hazırlanamadı.");
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  let render: RenderTask | undefined;
  let worker: Worker | undefined;
  const abort = () => {
    render?.cancel();
    worker?.terminate();
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    progress("Sayfa yazı tanımaya hazırlanıyor…");
    render = page.render({
      canvas,
      viewport,
      background: "#ffffff",
      transform: [1, 0, 0, 1, (border - left) * scale, (border - top) * scale],
    });
    await render.promise;
    signal.throwIfAborted();
    if (border) {
      const edge = border * scale;
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, edge);
      context.fillRect(0, canvas.height - edge, canvas.width, edge);
      context.fillRect(0, 0, edge, canvas.height);
      context.fillRect(canvas.width - edge, 0, edge, canvas.height);
    }
    const originalPixels = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    if (options.enhance) {
      const enhanced = new ImageData(
        originalPixels.data.slice(),
        canvas.width,
        canvas.height,
      );
      enhanceScan(enhanced.data);
      context.putImageData(enhanced, 0, 0);
    }
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Sayfa hazırlanamadı.")),
        "image/png",
      ),
    );
    const bytes = await blob.arrayBuffer();
    signal.throwIfAborted();
    worker = new Worker(new URL("./ocr.worker.ts", import.meta.url), {
      type: "module",
    });
    const paragraphs = await new Promise<OcrParagraph[]>((resolve, reject) => {
      const fail = () =>
        done(() =>
          reject(new DOMException("İşlem iptal edildi.", "AbortError")),
        );
      const timer = window.setTimeout(
        () =>
          done(() =>
            reject(
              new Error(
                "Yazı tanıma zaman aşımına uğradı. Daha küçük veya daha net bir tarama deneyin.",
              ),
            ),
          ),
        120000,
      );
      const done = (callback: () => void) => {
        window.clearTimeout(timer);
        signal.removeEventListener("abort", fail);
        callback();
      };
      signal.addEventListener("abort", fail, { once: true });
      worker!.onerror = () =>
        done(() => reject(new Error("Yerel yazı tanıma motoru yüklenemedi.")));
      worker!.onmessage = ({ data }) => {
        if (data.error) done(() => reject(new Error(data.error)));
        else if (data.result) done(() => resolve(data.result));
        else
          progress(
            data.status === "recognizing text"
              ? `Yazılar tanınıyor… %${Math.round(data.progress * 100)}`
              : "Yerel dil modeli hazırlanıyor…",
          );
      };
      worker!.postMessage(
        {
          bytes,
          options,
          assets: new URL(
            `${import.meta.env.BASE_URL}ocr-assets/`,
            document.baseURI,
          ).href,
        },
        [bytes],
      );
    });
    signal.throwIfAborted();
    const id = crypto.randomUUID();
    const selections = ["paragraph", "line", "word"] as const;
    const result: Record<OcrSelection, ReturnType<typeof ocrTargets>> & {
      background?: [number, number, number];
    } = { paragraph: [], line: [], word: [] };
    for (const selection of selections)
      result[selection] = ocrTargets(
        paragraphs,
        (x, y) =>
          viewport.convertToPdfPoint(
            x + (left - border) * scale,
            y + (top - border) * scale,
          ),
        scale,
        selection,
        `scan-${id}`,
      );
    if (options.preserveBackground) {
      for (const selection of selections)
        for (const target of result[selection]) {
          target.removal.fillColors = (
            target.removal.rects ?? [target.bounds]
          ).map((rect) => {
            const a = viewport.convertToViewportPoint(rect[0], rect[1]),
              b = viewport.convertToViewportPoint(rect[2], rect[3]);
            const crop: [number, number, number, number] = [
              Math.min(a[0], b[0]) + (border - left) * scale,
              Math.min(a[1], b[1]) + (border - top) * scale,
              Math.max(a[0], b[0]) + (border - left) * scale,
              Math.max(a[1], b[1]) + (border - top) * scale,
            ];
            return paperColor(
              originalPixels.data,
              canvas.width,
              canvas.height,
              crop,
              border * scale,
            );
          });
        }
      if (region)
        result.background = paperColor(
          originalPixels.data,
          canvas.width,
          canvas.height,
          [
            border * scale + 2,
            border * scale + 2,
            canvas.width - border * scale - 3,
            canvas.height - border * scale - 3,
          ],
          border * scale,
        );
    }
    return result;
  } finally {
    signal.removeEventListener("abort", abort);
    worker?.terminate();
    canvas.width = canvas.height = 0;
  }
}
