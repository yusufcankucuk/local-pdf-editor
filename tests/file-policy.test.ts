import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_FILE_BYTES,
  nextRotation,
  validatePdf,
} from "../src/features/document/filePolicy.ts";

const bytes = (value: string) => new TextEncoder().encode(value);

test("accepts PDF signatures, including a header offset", () => {
  assert.doesNotThrow(() => validatePdf(300, bytes("%PDF-1.7")));
  assert.doesNotThrow(() => validatePdf(300, bytes("\n%PDF-2.0")));
});

test("rejects empty, oversized and renamed non-PDF files", () => {
  assert.throws(() => validatePdf(0, bytes("%PDF-1.7")), /boş/);
  assert.throws(
    () => validatePdf(MAX_FILE_BYTES + 1, bytes("%PDF-1.7")),
    /100 MB/,
  );
  assert.throws(
    () => validatePdf(300, bytes("<html>not a PDF</html>")),
    /bir PDF değil/,
  );
});

test("page rotation wraps after four clockwise turns", () => {
  assert.deepEqual([0, 90, 180, 270].map(nextRotation), [90, 180, 270, 0]);
});
