import assert from "node:assert/strict";
import { test } from "node:test";

import { COUNTRY_CODES, countryLabel } from "../config/country-codes";
import { firstText, isoDate, safeUrl } from "./read-fields";

test("safeUrl keeps http(s) and drops everything else", () => {
  assert.equal(safeUrl("https://wuzzuf.net/jobs/p/1"), "https://wuzzuf.net/jobs/p/1");
  assert.equal(safeUrl("http://example.com"), "http://example.com/");
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("data:text/html,<script>"), null);
  assert.equal(safeUrl("ftp://x"), null);
  assert.equal(safeUrl("/relative/path"), null);
  assert.equal(safeUrl(null), null);
});

test("firstText reads dotted paths in order", () => {
  const item = { company: { name: "Khazna" } };
  assert.equal(firstText(item, ["companyName", "company.name"]), "Khazna");
});

test("firstText reads numbers as text and trims", () => {
  assert.equal(firstText({ salary: 35000 }, ["salary"]), "35000");
  assert.equal(firstText({ title: "  Back End Developer  " }, ["title"]), "Back End Developer");
});

test("firstText ignores objects, arrays and blanks", () => {
  assert.equal(firstText({ title: "  " }, ["title"]), null);
  assert.equal(firstText({ title: { x: 1 } }, ["title"]), null);
  assert.equal(firstText({ title: ["a"] }, ["title"]), null);
  assert.equal(firstText(null, ["title"]), null);
  assert.equal(firstText("a string", ["title"]), null);
});

test("isoDate reads ISO strings and epochs, keeps relative text", () => {
  assert.equal(isoDate("2026-11-20T10:00:00Z"), "2026-11-20T10:00:00.000Z");
  assert.equal(isoDate(1_763_632_800_000), "2025-11-20T10:00:00.000Z");
  assert.equal(isoDate(1_763_632_800), "2025-11-20T10:00:00.000Z");
  assert.equal(isoDate("2 days ago"), "2 days ago");
  assert.equal(isoDate(""), null);
  assert.equal(isoDate({}), null);
});

test("countryLabel names codes, and the list covers the world", () => {
  assert.equal(countryLabel("EG"), "Egypt");
  assert.equal(countryLabel("AE"), "United Arab Emirates");
  assert.ok(COUNTRY_CODES.length >= 240, String(COUNTRY_CODES.length));
  assert.ok(COUNTRY_CODES.includes("EG") && COUNTRY_CODES.includes("DE") && COUNTRY_CODES.includes("BR"));
  assert.equal(new Set(COUNTRY_CODES).size, COUNTRY_CODES.length);
});

test("firstText reads into arrays by index", () => {
  assert.equal(firstText({ locations: ["Cairo, Egypt"] }, ["locations.0"]), "Cairo, Egypt");
  assert.equal(firstText({ locations: [{ city: "Dubai" }] }, ["locations.0.city"]), "Dubai");
  assert.equal(firstText({ locations: [] }, ["locations.0"]), null);
  assert.equal(firstText({ locations: { 0: "not an array" } }, ["locations.0"]), "not an array");
});

test("isoDate reads written dates that carry a year", () => {
  assert.equal(isoDate("Nov 20, 2026"), new Date("Nov 20, 2026").toISOString());
  assert.equal(isoDate("3 weeks ago"), "3 weeks ago");
  assert.equal(isoDate("Posted today"), "Posted today");
});
