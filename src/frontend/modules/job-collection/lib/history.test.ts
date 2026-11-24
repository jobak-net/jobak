import assert from "node:assert/strict";
import { test } from "node:test";

import { addHistory, readHistory, readSites, saveSites, type HistoryEntry } from "./history";
import { blockedStorage, memoryStorage } from "./test-storage";

function entry(id: string): HistoryEntry {
  return {
    id,
    search: { title: "Software Engineer", country: "EG", city: "", jobsPerSite: 25 },
    runs: [{ site: "linkedin", runId: `run-${id}` }],
    startedAt: "2026-11-24T10:00:00.000Z",
  };
}

test("keeps the 5 newest searches, newest first", () => {
  const storage = memoryStorage();
  for (const id of ["1", "2", "3", "4", "5", "6"]) addHistory("a", entry(id), storage);

  assert.deepEqual(readHistory("a", storage).map((e) => e.id), ["6", "5", "4", "3", "2"]);
  assert.deepEqual(readHistory("b", storage), [], "another account sees none");
});

test("adding an entry again moves it to the top instead of duplicating it", () => {
  const storage = memoryStorage();
  addHistory("a", entry("1"), storage);
  addHistory("a", entry("2"), storage);
  addHistory("a", entry("1"), storage);
  assert.deepEqual(readHistory("a", storage).map((e) => e.id), ["1", "2"]);
});

test("malformed storage reads as empty", () => {
  const storage = memoryStorage();
  storage.setItem("jobak.job-collection.history.a", "{not json");
  assert.deepEqual(readHistory("a", storage), []);
  storage.setItem("jobak.job-collection.history.a", JSON.stringify([{ id: 1 }, "x", entry("ok")]));
  assert.deepEqual(readHistory("a", storage).map((e) => e.id), ["ok"]);
});

test("drops sites no longer in the catalogue", () => {
  const storage = memoryStorage();
  saveSites("a", ["linkedin", "workday", "wuzzuf"], storage);
  assert.deepEqual(readSites("a", storage), ["linkedin", "wuzzuf"]);

  const withGone = { ...entry("1"), runs: [{ site: "workday", runId: "r1" }, { site: "indeed", runId: "r2" }] };
  addHistory("a", withGone, storage);
  assert.deepEqual(readHistory("a", storage)[0].runs, [{ site: "indeed", runId: "r2" }]);
});

test("no saved sites reads as null, not an empty choice", () => {
  assert.equal(readSites("a", memoryStorage()), null);
});

test("blocked storage reads as empty and saving does nothing", () => {
  const storage = blockedStorage();
  assert.deepEqual(readHistory("a", storage), []);
  assert.deepEqual(addHistory("a", entry("1"), storage), [entry("1")]);
  assert.equal(readSites("a", storage), null);
  assert.doesNotThrow(() => saveSites("a", ["linkedin"], storage));
});
