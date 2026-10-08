import test from "node:test";
import assert from "node:assert/strict";
import { wrapText } from "../src/lib/textLayout.ts";
import { ocrTargets } from "../src/lib/ocrLayout.ts";
test("paragraph wrapping keeps newlines and Turkish words", () => {
  assert.deepEqual(
    wrapText("Türkçe metin burada\nİkinci satır", 12, (t) => t.length),
    ["Türkçe metin", "burada", "İkinci satır"],
  );
});
test("OCR paragraphs map crop coordinates and retain per-line pixel removals", () => {
  const target = ocrTargets(
    [
      {
        lines: [
          {
            text: "Çağrı Şahin",
            confidence: 95,
            bbox: { x0: 100, y0: 100, x1: 300, y1: 130 },
            baseline: { x0: 100, y0: 127, x1: 300, y1: 127 },
          },
          {
            text: "İkinci satır",
            confidence: 90,
            bbox: { x0: 100, y0: 145, x1: 300, y1: 175 },
            baseline: { x0: 100, y0: 172, x1: 300, y1: 172 },
          },
        ],
      },
    ],
    (x, y) => [x / 2 + 20, 500 - y / 2],
    2,
  )[0];
  assert.equal(target.removal.kind, "scan");
  assert.equal(target.removal.rects?.length, 2);
  assert.deepEqual(target.bounds, [69, 411.5, 171, 451]);
  assert.equal(
    target.overlay.kind === "text" && target.overlay.text,
    "Çağrı Şahin\nİkinci satır",
  );
  assert.equal(
    target.overlay.kind === "text" && target.overlay.lineHeight,
    22.5,
  );
});

test("OCR word selection preserves neighbors and blank table gaps; rotated text keeps direction", () => {
  const line = {
    text: "Ölçüm tamamlandı",
    confidence: 85,
    bbox: { x0: 10, y0: 20, x1: 150, y1: 40 },
    baseline: { x0: 10, y0: 39, x1: 150, y1: 39 },
    words: [
      {
        text: "Ölçüm",
        confidence: 96,
        bbox: { x0: 10, y0: 20, x1: 55, y1: 40 },
      },
      {
        text: "tamamlandı",
        confidence: 45,
        bbox: { x0: 85, y0: 20, x1: 150, y1: 40 },
      },
    ],
  };
  const paragraphs = [{ lines: [line] }];
  const mapped = ocrTargets(paragraphs, (x, y) => [x / 2, 200 - y / 2], 2);
  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].removal.rects?.length, 2);
  assert.ok(mapped[0].removal.rects![0][2] < mapped[0].removal.rects![1][0]);
  const words = ocrTargets(
    paragraphs,
    (x, y) => [x / 2, 200 - y / 2],
    2,
    "word",
  );
  assert.equal(words.length, 2);
  assert.equal(
    words[0].overlay.kind === "text" && words[0].overlay.text,
    "Ölçüm",
  );
  assert.equal(
    words[1].overlay.kind === "text" && words[1].overlay.ocrConfidence,
    45,
  );
  const rotated = ocrTargets(paragraphs, (x, y) => [y / 2, x / 2], 2, "line");
  assert.equal(
    rotated[0].overlay.kind === "text" && rotated[0].overlay.rotation,
    90,
  );
  assert.equal(
    rotated[0].overlay.kind === "text" && rotated[0].overlay.textWidth,
    70,
  );
});
