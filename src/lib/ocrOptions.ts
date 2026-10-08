export type PdfRect = [number, number, number, number];
export type OcrOptions = {
  layout: "auto" | "block" | "sparse";
  enhance: boolean;
  preserveBackground: boolean;
  rotation: 0 | 90 | 180 | 270;
};
export type OcrSelection = "paragraph" | "line" | "word";
export const defaultOcrOptions: OcrOptions = {
  layout: "auto",
  enhance: true,
  preserveBackground: true,
  rotation: 0,
};
// Contrast stretch removes gray paper without changing the source document.
export function enhanceScan(pixels: Uint8ClampedArray) {
  const histogram = new Uint32Array(256);
  for (let at = 0; at < pixels.length; at += 4)
    histogram[
      Math.round(
        pixels[at] * 0.299 + pixels[at + 1] * 0.587 + pixels[at + 2] * 0.114,
      )
    ]++;
  const count = pixels.length / 4,
    margin = count * 0.005;
  let low = 0,
    high = 255,
    total = 0;
  for (; low < 255; low++) {
    total += histogram[low];
    if (total > margin) break;
  }
  total = 0;
  for (; high > 0; high--) {
    total += histogram[high];
    if (total > margin) break;
  }
  if (high - low < 15) return;
  for (let at = 0; at < pixels.length; at += 4) {
    const gray =
      pixels[at] * 0.299 + pixels[at + 1] * 0.587 + pixels[at + 2] * 0.114;
    const value = Math.max(
      0,
      Math.min(255, Math.round(((gray - low) * 255) / (high - low))),
    );
    pixels[at] = pixels[at + 1] = pixels[at + 2] = value;
  }
}

export function paperColor(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  rect: PdfRect,
  inset = 0,
): [number, number, number] {
  const samples: { color: number[]; light: number }[] = [];
  const sample = (x: number, y: number) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < inset || y < inset || x >= width - inset || y >= height - inset)
      return;
    const at = (y * width + x) * 4,
      r = pixels[at],
      g = pixels[at + 1],
      b = pixels[at + 2];
    samples.push({
      color: [r, g, b],
      light: r * 0.299 + g * 0.587 + b * 0.114,
    });
  };
  const [x0, y0, x1, y1] = rect,
    step = Math.max(1, Math.ceil(Math.max(x1 - x0, y1 - y0) / 100));
  for (let x = x0 - 2; x <= x1 + 2; x += step) {
    sample(x, y0 - 2);
    sample(x, y1 + 2);
  }
  for (let y = y0 - 2; y <= y1 + 2; y += step) {
    sample(x0 - 2, y);
    sample(x1 + 2, y);
  }
  samples.sort((a, b) => b.light - a.light);
  const paper = samples.slice(0, Math.max(1, Math.ceil(samples.length / 2)));
  if (!paper.length) return [1, 1, 1];
  return [0, 1, 2].map(
    (channel) =>
      paper.reduce((total, p) => total + p.color[channel], 0) /
      paper.length /
      255,
  ) as [number, number, number];
}
