import test from "node:test";
import assert from "node:assert/strict";
import { findTextMatches } from "../src/features/search/search.ts";

test("search maps a phrase across text runs to the original offsets", () => {
  assert.deepEqual(findTextMatches(["Room for", "good ideas."], "for good"), [
    { run: 0, start: 5, end: 8, occurrence: 0 },
    { run: 1, start: 0, end: 4, occurrence: 0 },
  ]);
});
test("search handles Turkish case, repeated occurrences and an empty query", () => {
  assert.equal(findTextMatches(["İMZA imza"], "imza").length, 2);
  assert.equal(findTextMatches(["belge"], "  ").length, 0);
  assert.equal(findTextMatches(["hello"], "missing").length, 0);
});
