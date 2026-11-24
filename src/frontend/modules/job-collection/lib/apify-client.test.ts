import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { abortRun, actorPrice, ApifyError, datasetItems, getLimits, getRun, retryApify, startRun, verifyToken } from "./apify-client";

interface Recorded {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

const realFetch = globalThis.fetch;
let calls: Recorded[] = [];

/** Answers every request with `status` and `body`, recording what was sent. */
function fakeFetch(status: number, body: unknown) {
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => (headers[key] = value));
    calls.push({ url: String(input), method: init?.method ?? "GET", headers, body: (init?.body as string) ?? null });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

const RUN = { data: { id: "run1", status: "RUNNING", defaultDatasetId: "ds1", stats: { itemCount: 4 }, usageTotalUsd: 0.01 } };

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("sends the token only as a Bearer header", async () => {
  fakeFetch(200, RUN);
  await startRun("secret-token", "user/name", { q: 1 }, { maxItems: 25, maxTotalChargeUsd: 0.0605 });
  await getRun("secret-token", "run1", 30);
  await abortRun("secret-token", "run1");
  for (const call of calls) {
    assert.equal(call.headers.authorization, "Bearer secret-token");
    assert.ok(!call.url.includes("secret-token"), call.url);
    assert.ok(!call.url.includes("token="), call.url);
  }
});

test("only calls api.apify.com", async () => {
  fakeFetch(200, { data: { items: [] } });
  await actorPrice("user/name");
  fakeFetch(200, []);
  await datasetItems("t", "ds1", 10);
  fakeFetch(200, { data: { username: "omar", plan: { id: "FREE" } } });
  await verifyToken("t");
  for (const call of calls) assert.ok(call.url.startsWith("https://api.apify.com/v2/"), call.url);
});

test("starts a run with the caps", async () => {
  fakeFetch(201, RUN);
  const run = await startRun("t", "user/name", { query: "dev" }, { maxItems: 25, maxTotalChargeUsd: 0.0605 });
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url, "https://api.apify.com/v2/acts/user~name/runs?maxItems=25&maxTotalChargeUsd=0.0605");
  assert.deepEqual(JSON.parse(calls[0].body ?? "null"), { query: "dev" });
  assert.deepEqual(run, { id: "run1", status: "RUNNING", defaultDatasetId: "ds1", itemCount: 4, usageTotalUsd: 0.01 });
});

test("maps statuses to error kinds", async () => {
  const cases: [number, ApifyError["kind"]][] = [
    [401, "unauthorized"],
    [403, "forbidden"],
    [402, "payment"],
    [404, "not-found"],
    [400, "invalid-input"],
    [429, "rate-limited"],
    [500, "unavailable"],
    [503, "unavailable"],
  ];
  for (const [status, kind] of cases) {
    fakeFetch(status, { error: { type: "x", message: "y" } });
    await assert.rejects(getRun("t", "run1"), (error: unknown) => error instanceof ApifyError && error.kind === kind);
  }
});

test("a fetch that throws is a network error", async () => {
  globalThis.fetch = (async () => {
    throw new TypeError("Failed to fetch");
  }) as typeof fetch;
  await assert.rejects(verifyToken("t"), (error: unknown) => error instanceof ApifyError && error.kind === "network");
});

test("getRun waits for the finish", async () => {
  fakeFetch(200, RUN);
  await getRun("t", "run1", 30);
  assert.equal(calls[0].url, "https://api.apify.com/v2/actor-runs/run1?waitForFinish=30");
});

test("datasetItems asks for clean items with a limit", async () => {
  fakeFetch(200, [{ title: "a" }]);
  assert.deepEqual(await datasetItems("t", "ds1", 25), [{ title: "a" }]);
  assert.equal(calls[0].url, "https://api.apify.com/v2/datasets/ds1/items?clean=true&limit=25");
});

test("verifyToken returns the username and plan", async () => {
  fakeFetch(200, { data: { username: "omar", plan: { id: "FREE" } } });
  assert.deepEqual(await verifyToken("t"), { username: "omar", plan: "FREE" });
});

test("actorPrice reads the FREE tier of pay-per-event actors", async () => {
  fakeFetch(200, {
    data: {
      items: [
        { username: "other", name: "thing", currentPricingInfo: { pricingModel: "PRICE_PER_DATASET_ITEM", pricePerUnitUsd: 9 } },
        {
          username: "user",
          name: "name",
          currentPricingInfo: {
            pricingModel: "PAY_PER_EVENT",
            pricingPerEvent: {
              actorChargeEvents: {
                "actor-start": { eventTitle: "Actor Start", eventPriceUsd: 0.005 },
                result: { eventTitle: "Result", eventTieredPricingUsd: { FREE: { tieredEventPriceUsd: 0.001 }, GOLD: { tieredEventPriceUsd: 0.0005 } } },
              },
            },
          },
        },
      ],
    },
  });
  assert.deepEqual(await actorPrice("user/name"), { perJobUsd: 0.001, startUsd: 0.005 });
  assert.ok(!("authorization" in calls[0].headers));
});

test("actorPrice reads the price per dataset item", async () => {
  fakeFetch(200, { data: { items: [{ username: "user", name: "name", currentPricingInfo: { pricingModel: "PRICE_PER_DATASET_ITEM", pricePerUnitUsd: 0.002 } }] } });
  assert.deepEqual(await actorPrice("user/name"), { perJobUsd: 0.002, startUsd: 0 });
});

test("actorPrice is null when the store doesn't list the actor", async () => {
  fakeFetch(200, { data: { items: [] } });
  assert.equal(await actorPrice("user/name"), null);
});

test("retries only what can pass on a second try", () => {
  for (const kind of ["network", "unavailable", "rate-limited"] as const) {
    assert.equal(retryApify(0, new ApifyError(kind, "")), true, kind);
    assert.equal(retryApify(2, new ApifyError(kind, "")), false, `${kind} after two tries`);
  }
  for (const kind of ["unauthorized", "forbidden", "payment", "not-found", "invalid-input"] as const) {
    assert.equal(retryApify(0, new ApifyError(kind, "")), false, kind);
  }
});

test("too many runs at once is busy, not payment", async () => {
  fakeFetch(402, { error: { type: "concurrent-runs-limit-exceeded", message: "limit of 5 concurrent Actor runs" } });
  await assert.rejects(
    startRun("t", "user/name", {}, { maxItems: 10, maxTotalChargeUsd: 0.1 }),
    (error: unknown) => error instanceof ApifyError && error.kind === "busy",
  );
  assert.equal(retryApify(0, new ApifyError("busy", "")), false, "the page queues busy runs itself");
});

test("getLimits reads spend, limit and how many runs may go at once", async () => {
  fakeFetch(200, { data: { limits: { maxMonthlyUsageUsd: 5, maxConcurrentActorJobs: 5 }, current: { monthlyUsageUsd: 0.6 } } });
  assert.deepEqual(await getLimits("t"), { usedUsd: 0.6, limitUsd: 5, concurrentRuns: 5 });
});

test("a run's item count comes from its charged dataset items when stats has none", async () => {
  fakeFetch(200, { data: { id: "r", status: "RUNNING", defaultDatasetId: "d", stats: { runTimeSecs: 3 }, chargedEventCounts: { "apify-default-dataset-item": 7, "apify-actor-start": 1 } } });
  assert.equal((await getRun("t", "r")).itemCount, 7);
  fakeFetch(200, { data: { id: "r", status: "RUNNING", defaultDatasetId: "d", stats: {} } });
  assert.equal((await getRun("t", "r")).itemCount, 0);
});
