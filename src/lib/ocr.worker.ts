import type { OcrOptions } from "./ocrOptions";
import { createWorker, OEM, PSM } from "tesseract.js";

self.onmessage = async ({
  data,
}: MessageEvent<{
  bytes: ArrayBuffer;
  assets: string;
  options: OcrOptions;
}>) => {
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  try {
    worker = await createWorker("tur+eng", OEM.LSTM_ONLY, {
      workerPath: new URL("worker.min.js", data.assets).href,
      corePath: data.assets,
      langPath: new URL("lang/", data.assets).href,
      workerBlobURL: false,
      cacheMethod: "none",
      logger: ({ status, progress }) => self.postMessage({ status, progress }),
      errorHandler: () => {},
    });
    await worker.setParameters({
      tessedit_pageseg_mode:
        data.options.layout === "block"
          ? PSM.SINGLE_BLOCK
          : data.options.layout === "sparse"
            ? PSM.SPARSE_TEXT
            : PSM.AUTO,
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
      thresholding_method: data.options.enhance ? "2" : "0",
    });
    const result = await worker.recognize(
      new Blob([data.bytes], { type: "image/png" }),
      {},
      { blocks: true, text: true },
    );
    // Send only the small layout tree, without circular parent references or debug images.
    const paragraphs = (result.data.blocks ?? []).flatMap((block) =>
      block.paragraphs.map((paragraph) => ({
        lines: paragraph.lines.map((line) => ({
          text: line.text,
          confidence: line.confidence,
          bbox: line.bbox,
          baseline: line.baseline,
          words: line.words.map((word) => ({
            text: word.text,
            confidence: word.confidence,
            bbox: word.bbox,
          })),
        })),
      })),
    );
    self.postMessage({ result: paragraphs });
  } catch {
    self.postMessage({
      error:
        "Yazı tanınamadı. Sayfayı kontrol edip yeniden deneyin; orijinal belge korundu.",
    });
  } finally {
    await worker?.terminate();
  }
};
