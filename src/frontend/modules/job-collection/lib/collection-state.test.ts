import assert from "node:assert/strict";
import { test } from "node:test";

import { collectionReducer, initialCollection, isCollecting, type CollectionState } from "./collection-state";

const run = (id: string) => ({ id: `run-${id}`, status: "RUNNING" as const, defaultDatasetId: `ds-${id}`, itemCount: 0, usageTotalUsd: null });

function started(sites: string[]): CollectionState {
  let state = collectionReducer(initialCollection, { type: "begin", sites });
  for (const site of sites) state = collectionReducer(state, { type: "started", site, run: run(site) });
  return state;
}

test("one site failing leaves the others running", () => {
  const state = collectionReducer(started(["a", "b"]), { type: "failed", site: "a", kind: "unauthorized" });
  assert.equal(state.runs.find((r) => r.site === "a")?.phase, "failed");
  assert.equal(state.runs.find((r) => r.site === "b")?.phase, "running");
  assert.equal(isCollecting(state), true);
});

test("stop marks only unfinished runs stopped", () => {
  let state = collectionReducer(initialCollection, { type: "begin", sites: ["a", "b", "c"] });
  state = collectionReducer(state, { type: "started", site: "a", run: run("a") });
  state = collectionReducer(state, { type: "fetched", site: "a", jobs: [], dropped: 0, stopped: false });
  state = collectionReducer(state, { type: "started", site: "b", run: run("b") });
  state = collectionReducer(state, { type: "stopped", site: "c" });

  const phases = Object.fromEntries(state.runs.map((r) => [r.site, r.phase]));
  assert.deepEqual(phases, { a: "done", b: "running", c: "stopped" });
});

test("resume uses stored run ids and never adds a start", () => {
  const state = collectionReducer(initialCollection, { type: "begin", sites: ["a"], runIds: { a: "run-a" } });
  assert.equal(state.runs[0].phase, "running");
  assert.equal(state.runs[0].runId, "run-a");
});

test("dropped counts add up", () => {
  let state = started(["a", "b"]);
  state = collectionReducer(state, { type: "fetched", site: "a", jobs: [], dropped: 2, stopped: false });
  state = collectionReducer(state, { type: "fetched", site: "b", jobs: [], dropped: 3, stopped: false });
  assert.equal(state.runs.reduce((sum, r) => sum + r.dropped, 0), 5);
  assert.equal(isCollecting(state), false);
});

test("a busy site goes back to waiting", () => {
  let state = collectionReducer(initialCollection, { type: "begin", sites: ["a"] });
  state = collectionReducer(state, { type: "starting", site: "a" });
  state = collectionReducer(state, { type: "waiting", site: "a" });
  assert.equal(state.runs[0].phase, "queued");
});
