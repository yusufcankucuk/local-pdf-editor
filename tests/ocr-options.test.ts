import test from "node:test";
import assert from "node:assert/strict";
import { enhanceScan, paperColor } from "../src/lib/ocrOptions.ts";
test("scan enhancement stretches gray paper and ink while keeping alpha", () => {
  const pixels = new Uint8ClampedArray([
    80, 80, 80, 255, 200, 200, 200, 255, 120, 120, 120, 255,
  ]);
  enhanceScan(pixels);
  assert.equal(pixels[0], 0);
  assert.equal(pixels[4], 255);
  assert.equal(pixels[3], 255);
  const blank = new Uint8ClampedArray([245, 245, 245, 255]);
  enhanceScan(blank);
  assert.deepEqual([...blank], [245, 245, 245, 255]);
});

test("paper color sampling ignores ink and ruled lines around a selected word", () => {
  const width = 30,
    height = 20,
    pixels = new Uint8ClampedArray(width * height * 4);
  for (let at = 0; at < pixels.length; at += 4)
    pixels.set([220, 215, 205, 255], at);
  for (let x = 0; x < width; x++)
    pixels.set([80, 80, 80, 255], (8 * width + x) * 4);
  const color = paperColor(pixels, width, height, [10, 6, 20, 14]);
  assert.ok(Math.abs(color[0] - 220 / 255) < 0.01);
  assert.ok(Math.abs(color[2] - 205 / 255) < 0.01);
});
