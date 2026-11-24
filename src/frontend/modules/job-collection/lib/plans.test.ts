import assert from "node:assert/strict";
import { test } from "node:test";

import { planSites, totalEstimate } from "./plans";

const SEARCH = { title: "Software Engineer", country: "EG", city: "", jobsPerSite: 25 as const };

test("plans only the sites that cover the country", () => {
  const plans = planSites(["linkedin", "naukri", "wuzzuf"], SEARCH, {});
  assert.deepEqual(plans.map((p) => p.entry.id), ["linkedin", "wuzzuf"]);
});

test("ignores ids no longer in the catalogue", () => {
  assert.deepEqual(planSites(["workday", "linkedin"], SEARCH, {}).map((p) => p.entry.id), ["linkedin"]);
});

test("prices each site from the live price, else its stored one, rounding pages up", () => {
  const plans = planSites(["wuzzuf", "google-jobs"], SEARCH, { wuzzuf: { perJobUsd: 0.002, startUsd: 0.005 } });
  assert.equal(plans[0].estimateUsd, 0.055);
  // Google Jobs' stored price: $0.005 per job + $0.02 start, 25 jobs = 3 pages of 10.
  assert.equal(plans[1].estimateUsd, 0.17);
  assert.equal(totalEstimate(plans), 0.225);
});
