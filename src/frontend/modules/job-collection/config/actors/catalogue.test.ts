import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { coversCountry, type ActorEntry, type SearchInput } from "../../types/catalogue";
import { safeUrl } from "../../lib/read-fields";
import { CATEGORIES } from "../categories";
import { ACTORS, actorById } from "./index";

const FIXTURES = join(__dirname, "__fixtures__");

/** Sites dropped or swapped after the closer look in Task 5 (recorded in the spec). */
const EXPECTED_COUNT = 39;

function sampleCountry(entry: ActorEntry): string {
  return entry.covers === "any" ? "EG" : entry.covers[0];
}

function search(entry: ActorEntry, jobsPerSite: SearchInput["jobsPerSite"] = 25): SearchInput {
  return { title: "Software Engineer", country: sampleCountry(entry), city: "", jobsPerSite };
}

const EXTRAS = /telegram|slack|discord|whatsapp|webhook|appConnector|anthropic|openai|notif/i;
const OFF_FLAGS = ["incrementalMode", "browserFallback", "enrichEmails", "includeContactDetails", "include_contact_details", "extractEmails"];

function keysDeep(value: unknown, out: [string, unknown][] = []): [string, unknown][] {
  if (value && typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) {
      out.push([key, inner]);
      keysDeep(inner, out);
    }
  }
  return out;
}

test("the catalogue has every site once and every category", () => {
  assert.equal(ACTORS.length, EXPECTED_COUNT);
  assert.equal(new Set(ACTORS.map((a) => a.id)).size, ACTORS.length, "ids are unique");
  assert.equal(new Set(ACTORS.map((a) => a.actorId)).size, ACTORS.length, "actors are unique");
  for (const category of CATEGORIES) {
    assert.ok(ACTORS.some((a) => a.category === category.id), `${category.id} has a site`);
  }
  assert.equal(actorById("linkedin")?.site, "LinkedIn");
});

for (const entry of ACTORS) {
  test(`${entry.id}: buildInput caps results at jobs per site`, () => {
    for (const jobsPerSite of [10, 25, 100] as const) {
      const input = JSON.stringify(entry.buildInput(search(entry, jobsPerSite)));
      const cap = entry.pageSize ? Math.ceil(jobsPerSite / entry.pageSize) : jobsPerSite;
      assert.ok(new RegExp(`:${cap}[,}\\]]`).test(input), `${cap} in ${input}`);
    }
  });

  test(`${entry.id}: buildInput turns extras off`, () => {
    for (const [key, value] of keysDeep(entry.buildInput(search(entry)))) {
      if (EXTRAS.test(key)) assert.ok(!value, `${key} is off`);
      if (OFF_FLAGS.includes(key)) assert.equal(value, false, `${key} is false`);
    }
  });

  test(`${entry.id}: buildInput carries the title`, () => {
    assert.ok(JSON.stringify(entry.buildInput(search(entry))).includes("Software Engineer"));
  });

  test(`${entry.id}: readJob reads its fixture`, () => {
    const file = join(FIXTURES, `${entry.id}.json`);
    assert.ok(existsSync(file), `fixture ${entry.id}.json exists`);
    const job = entry.readJob(JSON.parse(readFileSync(file, "utf8")));
    assert.ok(job, "the fixture reads as a job");
    assert.ok(job.title.length > 0);
    assert.equal(safeUrl(job.url), job.url);
    for (const key of Object.keys(job)) assert.ok(!/email|phone|contact/i.test(key), key);
  });

  test(`${entry.id}: readJob drops what isn't a job`, () => {
    assert.equal(entry.readJob(null), null);
    assert.equal(entry.readJob({}), null);
    assert.equal(entry.readJob({ title: "x", url: "javascript:alert(1)" }), null);
  });

  if (entry.covers !== "any") {
    test(`${entry.id}: uncovered countries are refused`, () => {
      assert.equal(coversCountry(entry, "ZZ"), false);
      assert.ok(entry.covers.length > 0);
    });
  }
}
