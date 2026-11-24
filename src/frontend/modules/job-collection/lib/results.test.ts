import assert from "node:assert/strict";
import { test } from "node:test";

import type { CollectedJob } from "../types/catalogue";
import { mergeJobs, runCap, siteEstimate, toCsv } from "./results";

function job(overrides: Partial<CollectedJob>): CollectedJob {
  return { site: "linkedin", title: "Engineer", company: "Khazna", location: "Cairo", url: "https://a.example/1", postedAt: null, salary: null, ...overrides };
}

test("the estimate is the start fee plus jobs times the price", () => {
  assert.equal(siteEstimate({ perJobUsd: 0.002, startUsd: 0.005 }, 25), 0.055);
  assert.equal(runCap(0.055), 0.0605);
});

test("the estimate rounds up to whole pages for actors that page", () => {
  // 25 jobs on a 10-per-page actor is 3 pages, 30 jobs.
  assert.equal(siteEstimate({ perJobUsd: 0.005, startUsd: 0.02 }, 25, 10), 0.17);
});

test("a missing per-job price falls back", () => {
  assert.equal(siteEstimate({ perJobUsd: null, startUsd: 0.001 }, 10, undefined, { perJobUsd: 0.003, startUsd: 0.5 }), 0.031);
});

test("dedupes the same listing from two sites, first seen wins", () => {
  const merged = mergeJobs([
    [job({ site: "linkedin", url: "https://Jobs.Example.com/view/1?utm_source=x&refId=abc#top" })],
    [job({ site: "google-jobs", url: "https://jobs.example.com/view/1/" })],
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].site, "linkedin");
});

test("merges the same job posted on two sites, by title, company and place", () => {
  const merged = mergeJobs([
    [job({ site: "linkedin", url: "https://a.example/1", title: "Back End Developer", company: "Khazna", location: "Cairo" })],
    [job({ site: "wuzzuf", url: "https://b.example/9", title: "back end developer ", company: "KHAZNA", location: " cairo" })],
  ]);
  assert.equal(merged.length, 1);
});

test("keeps the same title at the same company in different cities", () => {
  const merged = mergeJobs([
    [
      job({ site: "linkedin", url: "https://a.example/1", title: "Software Engineer", company: "Amazon", location: "Cairo" }),
      job({ site: "linkedin", url: "https://a.example/2", title: "Software Engineer", company: "Amazon", location: "Dubai" }),
    ],
    [job({ site: "indeed", url: "https://b.example/3", title: "Software Engineer", company: "Amazon", location: "Riyadh" })],
  ]);
  assert.equal(merged.length, 3);
});

test("keeps two postings from one site even when title, company and place match", () => {
  const merged = mergeJobs([
    [
      job({ site: "linkedin", url: "https://a.example/1", title: "Software Engineer", company: "Amazon", location: "Cairo" }),
      job({ site: "linkedin", url: "https://a.example/2", title: "Software Engineer", company: "Amazon", location: "Cairo" }),
    ],
  ]);
  assert.equal(merged.length, 2, "a site lists them separately for a reason (different teams)");
});

test("keeps different jobs at the same company", () => {
  const merged = mergeJobs([[job({ url: "https://a.example/1", title: "Back End" }), job({ url: "https://a.example/2", title: "Front End" })]]);
  assert.equal(merged.length, 2);
});

test("sorts newest first, undated and relative dates last", () => {
  const merged = mergeJobs([
    [
      job({ url: "https://a.example/old", title: "old", postedAt: "2026-10-01T00:00:00.000Z" }),
      job({ url: "https://a.example/none", title: "none", postedAt: null }),
      job({ url: "https://a.example/new", title: "new", postedAt: "2026-11-20T00:00:00.000Z" }),
      job({ url: "https://a.example/rel", title: "rel", postedAt: "2 days ago" }),
    ],
  ]);
  assert.deepEqual(merged.map((j) => j.title).slice(0, 2), ["new", "old"]);
});

test("csv has a header, quotes what needs it, and defuses formulas", () => {
  const csv = toCsv([job({ title: '=HYPERLINK("x")', company: "Acme, Inc.", salary: null, postedAt: "2026-11-20T00:00:00.000Z" })]);
  const [header, row] = csv.split("\r\n");
  assert.equal(header, "Title,Company,Location,Posted,Salary,Site,Link");
  assert.ok(row.startsWith('"\'=HYPERLINK(""x"")","Acme, Inc.",Cairo,2026-11-20T00:00:00.000Z,,linkedin,https://a.example/1'), row);
});

test("csv defuses every formula lead character", () => {
  for (const lead of ["=", "+", "-", "@"]) {
    assert.ok(toCsv([job({ company: `${lead}cmd` })]).includes(`'${lead}cmd`), lead);
  }
});
