import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addLocalFont } from "../src/lib/sessionFonts.ts";
test("font import rejects malformed bytes and restricted embedding before loading into the browser", async () => {
  await assert.rejects(
    addLocalFont(new Uint8Array([0, 1, 2])),
    /Geçerli bir TTF/,
  );
  const bytes = new Uint8Array(readFileSync("src/assets/NotoSans-Regular.ttf"));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tables = view.getUint16(4);
  let os2 = -1;
  for (let table = 0; table < tables; table++) {
    const at = 12 + table * 16;
    if (String.fromCharCode(...bytes.subarray(at, at + 4)) === "OS/2")
      os2 = view.getUint32(at + 8);
  }
  assert.ok(os2 >= 0);
  view.setUint16(os2 + 8, 2);
  await assert.rejects(addLocalFont(bytes), /gömme/);
});
