import test from "node:test";
import assert from "node:assert/strict";
import { historyReducer, movePage } from "../src/features/editor/model.ts";
import type { EditorPage } from "../src/features/editor/model.ts";
const pages: EditorPage[] = [1, 2, 3].map((number) => ({
  id: String(number),
  sourceId: "original",
  sourcePage: number,
  rotation: 0,
  overlays: [],
}));

test("reordering preserves page identities and leaves the original array intact", () => {
  assert.deepEqual(
    movePage(pages, 0, 2).map((page) => page.id),
    ["2", "3", "1"],
  );
  assert.deepEqual(
    pages.map((page) => page.id),
    ["1", "2", "3"],
  );
  assert.equal(movePage(pages, 0, -1), pages);
});
test("undo and redo restore page edits, new edits clear redo", () => {
  const initial = { past: [], present: pages, future: [] };
  const changed = historyReducer(initial, {
    type: "commit",
    pages: movePage(pages, 0, 2),
  });
  const undone = historyReducer(changed, { type: "undo" });
  assert.equal(undone.present, pages);
  assert.deepEqual(
    historyReducer(undone, { type: "redo" }).present.map((page) => page.id),
    ["2", "3", "1"],
  );
  assert.equal(
    historyReducer(undone, { type: "commit", pages: pages.slice(0, 2) }).future
      .length,
    0,
  );
});
test("the last page cannot be removed through an empty commit", () => {
  const initial = { past: [], present: pages.slice(0, 1), future: [] };
  assert.equal(historyReducer(initial, { type: "commit", pages: [] }), initial);
});

test("shape endpoints retain the drag direction, including horizontal lines", async () => {
  const { shapeEndpoints } = await import("../src/features/editor/model.ts");
  assert.deepEqual(
    shapeEndpoints({ x: 10, y: 20, width: 50, height: 30, from: "nw" }),
    { start: { x: 10, y: 50 }, end: { x: 60, y: 20 } },
  );
  assert.deepEqual(
    shapeEndpoints({ x: 10, y: 20, width: 50, height: 0, from: "se" }),
    { start: { x: 60, y: 20 }, end: { x: 10, y: 20 } },
  );
});

test("object ordering is immutable and leaves boundary moves unchanged", async () => {
  const { orderOverlay } = await import("../src/features/editor/model.ts");
  const items = [
    { id: "a", kind: "form" as const, name: "a", value: "" },
    { id: "b", kind: "form" as const, name: "b", value: "" },
  ];
  assert.deepEqual(
    orderOverlay(items, "a", 1).map((item) => item.id),
    ["b", "a"],
  );
  assert.deepEqual(
    items.map((item) => item.id),
    ["a", "b"],
  );
  assert.equal(orderOverlay(items, "a", -1), items);
  assert.equal(orderOverlay(items, "missing", 1), items);
});
test("nudging moves every drawing point and preserves image properties", async () => {
  const { translateOverlay } = await import("../src/features/editor/model.ts");
  const drawing = {
    id: "a",
    kind: "draw" as const,
    points: [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ],
    color: "#000000",
    thickness: 2,
  };
  const moved = translateOverlay(drawing, 10, -1);
  assert.deepEqual(moved, {
    ...drawing,
    points: [
      { x: 11, y: 1 },
      { x: 13, y: 3 },
    ],
  });
  assert.deepEqual(drawing.points, [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ]);
  const image = {
    id: "b",
    kind: "image" as const,
    x: 5,
    y: 8,
    width: 100,
    height: 80,
    data: "data:image/png;base64,",
    opacity: 0.5,
  };
  assert.deepEqual(translateOverlay(image, 1, 10), { ...image, x: 6, y: 18 });
});
