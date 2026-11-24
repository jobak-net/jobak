import assert from "node:assert/strict";
import { test } from "node:test";

import type { ActorEntry, SearchInput } from "../types/catalogue";
import { ApifyError, type ApifyRun } from "./apify-client";
import { collectionReducer, initialCollection, type CollectionAction } from "./collection-state";
import { runCollection, type CollectionClient } from "./run-collection";

const SEARCH: SearchInput = { title: "Software Engineer", country: "EG", city: "", jobsPerSite: 10 };

function entry(id: string): ActorEntry {
  return {
    id,
    site: id,
    actorId: `user/${id}`,
    category: "worldwide",
    description: "",
    storeUrl: "",
    covers: "any",
    fallbackPrice: { perJobUsd: 0.001, startUsd: 0 },
    buildInput: (search) => ({ q: search.title, n: search.jobsPerSite }),
    readJob: (item) => {
      const { title, url } = item as { title?: string; url?: string };
      return title && url ? { title, url, company: null, location: null, postedAt: null, salary: null } : null;
    },
  };
}

const ENTRIES: Record<string, ActorEntry> = { a: entry("a"), b: entry("b"), c: entry("c"), d: entry("d") };

/** A fake Apify: every run finishes on its second poll with two good items and one bad one. */
function fakeClient(overrides: Partial<CollectionClient> = {}) {
  let active = 0;
  let peak = 0;
  const started: { actorId: string; maxItems: number; maxTotalChargeUsd: number }[] = [];
  const aborted: string[] = [];
  const polls = new Map<string, number>();
  const client: CollectionClient = {
    startRun: async (actorId, _input, options) => {
      started.push({ actorId, ...options });
      active++;
      peak = Math.max(peak, active);
      return { id: `run-${actorId}`, status: "RUNNING", defaultDatasetId: `ds-${actorId}`, itemCount: 0, usageTotalUsd: null };
    },
    getRun: async (runId) => {
      const count = (polls.get(runId) ?? 0) + 1;
      polls.set(runId, count);
      const finished = count >= 2 || aborted.includes(runId);
      if (finished) active--;
      const status = aborted.includes(runId) ? "ABORTED" : finished ? "SUCCEEDED" : "RUNNING";
      return { id: runId, status, defaultDatasetId: runId.replace("run-", "ds-"), itemCount: 3, usageTotalUsd: 0.01 } as ApifyRun;
    },
    abortRun: async (runId) => {
      aborted.push(runId);
      return { id: runId, status: "ABORTING", defaultDatasetId: "", itemCount: 0, usageTotalUsd: null };
    },
    datasetItems: async (datasetId) => [
      { title: `job 1 ${datasetId}`, url: `https://x.example/${datasetId}/1` },
      { title: `job 2 ${datasetId}`, url: `https://x.example/${datasetId}/2` },
      { title: "bad", url: "javascript:alert(1)" },
    ],
    ...overrides,
  };
  return { client, started, aborted, polls, peak: () => peak };
}

function collect() {
  const events: CollectionAction[] = [];
  let state = initialCollection;
  return {
    events,
    onEvent: (action: CollectionAction) => {
      events.push(action);
      state = collectionReducer(state, action);
    },
    state: () => state,
  };
}

/** A stop signal that never fires. */
const never = () => new AbortController().signal;

const plan = (ids: string[]) => ids.map((id) => ({ entry: ENTRIES[id], estimateUsd: 0.055 }));

test("starts each run with the caps, reads jobs and counts what it dropped", async () => {
  const fake = fakeClient();
  const log = collect();
  await runCollection({ client: fake.client, search: SEARCH, sites: plan(["a"]), maxConcurrent: 5, stop: never(), sleep: async () => {}, onEvent: log.onEvent });

  assert.deepEqual(fake.started, [{ actorId: "user/a", maxItems: 10, maxTotalChargeUsd: 0.0605 }]);
  const run = log.state().runs[0];
  assert.equal(run.phase, "done");
  assert.equal(run.jobs.length, 2);
  assert.equal(run.dropped, 1);
});

test("never runs more than the limit at once", async () => {
  const fake = fakeClient();
  const log = collect();
  await runCollection({ client: fake.client, search: SEARCH, sites: plan(["a", "b", "c", "d"]), maxConcurrent: 2, stop: never(), sleep: async () => {}, onEvent: log.onEvent });

  assert.equal(fake.started.length, 4);
  assert.ok(fake.peak() <= 2, `peak ${fake.peak()}`);
  assert.ok(log.state().runs.every((run) => run.phase === "done"));
});

test("one site's rejected token leaves the others to finish", async () => {
  const fake = fakeClient({
    startRun: async (actorId, _input, options) => {
      if (actorId === "user/b") throw new ApifyError("unauthorized", "401");
      return { id: `run-${actorId}`, status: "RUNNING", defaultDatasetId: `ds-${actorId}`, itemCount: 0, usageTotalUsd: null, ...options && {} };
    },
  });
  const log = collect();
  await runCollection({ client: fake.client, search: SEARCH, sites: plan(["a", "b", "c"]), maxConcurrent: 5, stop: never(), sleep: async () => {}, onEvent: log.onEvent });

  const bySite = Object.fromEntries(log.state().runs.map((run) => [run.site, run]));
  assert.equal(bySite.b.phase, "failed");
  assert.equal(bySite.b.error, "unauthorized");
  assert.equal(bySite.a.phase, "done");
  assert.equal(bySite.c.phase, "done");
});

test("a busy answer waits and tries again", async () => {
  let refusals = 1;
  const base = fakeClient();
  const fake = fakeClient({
    startRun: async (actorId, input, options) => {
      if (refusals-- > 0) throw new ApifyError("busy", "limit of 5 concurrent runs");
      return base.client.startRun(actorId, input, options);
    },
  });
  let slept = 0;
  const log = collect();
  await runCollection({ client: fake.client, search: SEARCH, sites: plan(["a"]), maxConcurrent: 5, stop: never(), sleep: async () => void slept++, onEvent: log.onEvent });

  assert.equal(slept, 1);
  assert.equal(log.state().runs[0].phase, "done");
});

test("resume polls the stored run ids and never starts a run", async () => {
  const fake = fakeClient();
  const log = collect();
  await runCollection({
    client: fake.client,
    search: SEARCH,
    sites: [{ entry: ENTRIES.a, estimateUsd: 0, runId: "run-user/a" }],
    maxConcurrent: 5,
    stop: never(),
    sleep: async () => {},
    onEvent: log.onEvent,
  });

  assert.equal(fake.started.length, 0);
  assert.equal(log.state().runs[0].phase, "done");
  assert.equal(log.state().runs[0].jobs.length, 2);
});

test("stop aborts running runs, skips queued ones and keeps what came back", async () => {
  const stopper = new AbortController();
  const fake = fakeClient({
    getRun: async (runId) => {
      stopper.abort(); // the user presses Stop during the first poll
      return { id: runId, status: fake.aborted.includes(runId) ? "ABORTED" : "RUNNING", defaultDatasetId: runId.replace("run-", "ds-"), itemCount: 3, usageTotalUsd: 0 };
    },
  });
  const log = collect();
  await runCollection({ client: fake.client, search: SEARCH, sites: plan(["a", "b"]), maxConcurrent: 1, stop: stopper.signal, sleep: async () => {}, onEvent: log.onEvent });

  const bySite = Object.fromEntries(log.state().runs.map((run) => [run.site, run]));
  assert.deepEqual(fake.aborted, ["run-user/a"]);
  assert.equal(bySite.a.phase, "stopped");
  assert.equal(bySite.a.jobs.length, 2, "what it found before stopping is kept");
  assert.equal(bySite.b.phase, "stopped");
  assert.equal(fake.started.length, 1, "the queued site never started");
});

test("a run whose dataset is gone says so", async () => {
  const fake = fakeClient({
    datasetItems: async () => {
      throw new ApifyError("not-found", "404");
    },
  });
  const log = collect();
  await runCollection({ client: fake.client, search: SEARCH, sites: plan(["a"]), maxConcurrent: 5, stop: never(), sleep: async () => {}, onEvent: log.onEvent });
  assert.equal(log.state().runs[0].phase, "failed");
  assert.equal(log.state().runs[0].error, "not-found");
});

test("a failed run with nothing collected is a failed site", async () => {
  const fake = fakeClient({
    getRun: async (runId) => ({ id: runId, status: "FAILED", defaultDatasetId: "ds", itemCount: 0, usageTotalUsd: 0 }),
    datasetItems: async () => [],
  });
  const log = collect();
  await runCollection({ client: fake.client, search: SEARCH, sites: plan(["a"]), maxConcurrent: 5, stop: never(), sleep: async () => {}, onEvent: log.onEvent });
  assert.equal(log.state().runs[0].phase, "failed");
  assert.equal(log.state().runs[0].error, "run-failed");
});

test("a finished run that reports no item count still has its dataset read", async () => {
  const fake = fakeClient({
    getRun: async (runId) => ({ id: runId, status: "SUCCEEDED", defaultDatasetId: "ds-x", itemCount: 0, usageTotalUsd: 0 }),
  });
  const log = collect();
  await runCollection({ client: fake.client, search: SEARCH, sites: plan(["a"]), maxConcurrent: 5, stop: never(), sleep: async () => {}, onEvent: log.onEvent });
  assert.equal(log.state().runs[0].phase, "done");
  assert.equal(log.state().runs[0].jobs.length, 2);
});

test("Stop pressed during a long poll aborts the run at once", { timeout: 3000 }, async () => {
  const stopper = new AbortController();
  let release: () => void = () => {};
  const aborted: string[] = [];
  const fake = fakeClient({
    // Apify holds the poll open; it only answers once the run is aborted.
    getRun: (runId) =>
      new Promise((resolve) => {
        release = () => resolve({ id: runId, status: "ABORTED", defaultDatasetId: "ds-a", itemCount: 0, usageTotalUsd: 0 });
        if (aborted.includes(runId)) release();
      }),
    abortRun: async (runId) => {
      aborted.push(runId);
      release();
      return { id: runId, status: "ABORTING", defaultDatasetId: "", itemCount: 0, usageTotalUsd: null };
    },
  });
  const log = collect();
  const done = runCollection({ client: fake.client, search: SEARCH, sites: plan(["a"]), maxConcurrent: 5, stop: stopper.signal, sleep: async () => {}, onEvent: log.onEvent });
  await new Promise((r) => setTimeout(r, 20)); // the poll is now open
  stopper.abort();
  await done;
  assert.deepEqual(aborted, ["run-user/a"]);
  assert.equal(log.state().runs[0].phase, "stopped");
});

test("an abort that fails is tried again", async () => {
  const stopper = new AbortController();
  let abortCalls = 0;
  let abortedOk = false;
  const fake = fakeClient({
    getRun: async (runId) => {
      stopper.abort();
      return { id: runId, status: abortedOk ? "ABORTED" : "RUNNING", defaultDatasetId: "ds-a", itemCount: 0, usageTotalUsd: 0 };
    },
    abortRun: async (runId) => {
      abortCalls++;
      if (abortCalls === 1) throw new ApifyError("network", "offline");
      abortedOk = true;
      return { id: runId, status: "ABORTING", defaultDatasetId: "", itemCount: 0, usageTotalUsd: null };
    },
  });
  const log = collect();
  await runCollection({ client: fake.client, search: SEARCH, sites: plan(["a"]), maxConcurrent: 5, stop: stopper.signal, sleep: async () => {}, onEvent: log.onEvent });
  assert.ok(abortCalls >= 2, `abort tried ${abortCalls} times`);
  assert.equal(log.state().runs[0].phase, "stopped");
});

test("leaving the page starts nothing new and stops following, without aborting", async () => {
  const leaver = new AbortController();
  const fake = fakeClient({
    getRun: async (runId) => {
      leaver.abort(); // the page closes during the first poll
      return { id: runId, status: "RUNNING", defaultDatasetId: "ds", itemCount: 0, usageTotalUsd: 0 };
    },
  });
  const log = collect();
  await runCollection({ client: fake.client, search: SEARCH, sites: plan(["a", "b"]), maxConcurrent: 1, stop: never(), leave: leaver.signal, sleep: async () => {}, onEvent: log.onEvent });
  assert.equal(fake.started.length, 1, "the queued site never starts");
  assert.deepEqual(fake.aborted, [], "the running run is left to finish on Apify");
});
