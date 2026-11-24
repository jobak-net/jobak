import assert from "node:assert/strict";
import { test } from "node:test";

import { defaultSites, groupSites } from "./site-selection";

test("first visit picks LinkedIn, Indeed and the regional boards for the country", () => {
  assert.deepEqual(defaultSites("EG").sort(), ["bayt", "indeed", "linkedin", "wuzzuf"]);
  assert.deepEqual(defaultSites("AE").sort(), ["bayt", "gulftalent", "indeed", "linkedin", "naukrigulf", "wuzzuf"]);
});

test("a country Indeed doesn't cover just drops it", () => {
  assert.deepEqual(defaultSites("XK"), ["linkedin"]);
});

test("no country yet picks only the worldwide boards that cover any country", () => {
  assert.deepEqual(defaultSites(""), ["linkedin"]);
});

test("groups sites by category, covered ones first, the rest under other regions", () => {
  const { covered, other } = groupSites("EG", "");
  assert.equal(covered[0].category.id, "mena");
  assert.deepEqual(covered[0].sites.map((s) => s.id), ["wuzzuf", "bayt"]);
  assert.ok(other.some((group) => group.category.id === "europe"));
  assert.ok(!covered.some((group) => group.sites.some((s) => s.id === "naukri")), "Naukri is India only");
  assert.ok(other.flatMap((g) => g.sites).some((s) => s.id === "naukri"));
});

test("the filter narrows by site name, ignoring case", () => {
  const { covered, other } = groupSites("EG", "LINK");
  assert.deepEqual([...covered, ...other].flatMap((g) => g.sites.map((s) => s.id)), ["linkedin"]);
});
