import assert from "node:assert/strict";
import { test } from "node:test";

import { shouldScrollToResults } from "./scroll-to-results";

test("scrolls when a search has just finished with jobs", () => {
  assert.equal(shouldScrollToResults({ wasCollecting: true, collecting: false, jobCount: 12 }), true);
});

test("doesn't scroll while running, before any search, or when nothing came back", () => {
  assert.equal(shouldScrollToResults({ wasCollecting: true, collecting: true, jobCount: 12 }), false);
  assert.equal(shouldScrollToResults({ wasCollecting: false, collecting: false, jobCount: 12 }), false);
  assert.equal(shouldScrollToResults({ wasCollecting: true, collecting: false, jobCount: 0 }), false);
});
