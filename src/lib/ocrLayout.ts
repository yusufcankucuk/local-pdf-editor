import type { OcrSelection } from "./ocrOptions";
import type { ContentTarget } from "./contentTypes";
export type OcrParagraph = {
  lines: {
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    baseline: { x0: number; y0: number; x1: number; y1: number };
    words?: {
      text: string;
      confidence: number;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }[];
  }[];
};
export function ocrTargets(
  paragraphs: OcrParagraph[],
  transform: (x: number, y: number) => number[],
  scale: number,
  selection: OcrSelection = "paragraph",
  idPrefix = "scan",
): ContentTarget[] {
  if (selection !== "paragraph")
    paragraphs = paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) => {
        if (selection === "line" || !line.words?.length)
          return [{ lines: [line] }];
        return line.words.map((word) => ({
          lines: [
            {
              ...line,
              ...word,
              baseline: {
                ...line.baseline,
                x0: word.bbox.x0,
                x1: word.bbox.x1,
              },
              words: [word],
            },
          ],
        }));
      }),
    );
  const groups: OcrParagraph[] = [];
  for (const paragraph of paragraphs) {
    let group: OcrParagraph = { lines: [] };
    for (const line of paragraph.lines) {
      const previous = group.lines.at(-1);
      if (previous) {
        const height = Math.max(
          previous.bbox.y1 - previous.bbox.y0,
          line.bbox.y1 - line.bbox.y0,
        );
        const distance = line.baseline.y0 - previous.baseline.y0;
        if (
          distance < height * 0.6 ||
          distance > height * 2.2 ||
          Math.abs(line.bbox.x0 - previous.bbox.x0) > height * 2
        ) {
          groups.push(group);
          group = { lines: [] };
        }
      }
      group.lines.push(line);
    }
    if (group.lines.length) groups.push(group);
  }
  return groups.flatMap((paragraph, index) => {
    const lines = paragraph.lines.filter(
      (line) =>
        line.text.trim() &&
        line.confidence >= 10 &&
        Math.abs(line.baseline.y1 - line.baseline.y0) <
          Math.max(3, (line.bbox.y1 - line.bbox.y0) * 0.35),
    );
    if (!lines.length) return [];
    const rectangle = (line: {
      bbox: OcrParagraph["lines"][number]["bbox"];
    }) => {
      const a = transform(line.bbox.x0 - 2, line.bbox.y0 - 2),
        b = transform(line.bbox.x1 + 2, line.bbox.y1 + 2);
      return [
        Math.min(a[0], b[0]),
        Math.min(a[1], b[1]),
        Math.max(a[0], b[0]),
        Math.max(a[1], b[1]),
      ] as [number, number, number, number];
    };
    const hitRects = lines.map(rectangle);
    const rects = lines.flatMap((line) =>
      line.words?.length
        ? line.words.filter((word) => word.text.trim()).map(rectangle)
        : [rectangle(line)],
    );
    if (!rects.length) return [];
    const bounds: [number, number, number, number] = [
      Math.min(...rects.map((r) => r[0])),
      Math.min(...rects.map((r) => r[1])),
      Math.max(...rects.map((r) => r[2])),
      Math.max(...rects.map((r) => r[3])),
    ];
    const first = lines[0],
      origin = transform(first.bbox.x0, first.baseline.y0);
    const rawSize = Math.max(
      6,
      Math.min(120, ((first.bbox.y1 - first.bbox.y0) / scale) * 1.25),
    );
    const size = Math.round(rawSize * 10) / 10;
    const nextPoint = transform(first.bbox.x0 + scale, first.baseline.y0);
    const rotation = Math.round(
      (Math.atan2(nextPoint[1] - origin[1], nextPoint[0] - origin[0]) * 180) /
        Math.PI,
    );
    const spacing =
      lines.length > 1
        ? Math.abs(lines[1].baseline.y0 - first.baseline.y0) / scale
        : size * 1.3;
    const id = `${idPrefix}-${selection}-${index}`;
    return [
      {
        id,
        bounds,
        hitRects,
        removal: { id, kind: "scan" as const, rect: bounds, rects },
        overlay: {
          id,
          kind: "text" as const,
          x: origin[0],
          y: origin[1],
          text: lines.map((line) => line.text.trim()).join("\n"),
          font: "sans" as const,
          size,
          color: "#222222",
          textWidth:
            Math.max(...lines.map((line) => line.bbox.x1 - line.bbox.x0)) /
            scale,
          rotation,
          ocrConfidence:
            lines.reduce((sum, line) => sum + line.confidence, 0) /
            lines.length,
          lineHeight: spacing,
        },
      },
    ];
  });
}
