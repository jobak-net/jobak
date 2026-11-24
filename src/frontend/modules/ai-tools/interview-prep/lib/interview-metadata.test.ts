import assert from "node:assert/strict";
import { test } from "node:test";

import { buildAgentMetadata, canStart, INTERVIEW_LIMITS } from "./interview-metadata";

const DETAILS = { role: "  Back End Developer ", company: " Khazna ", jobDescription: "Build payments APIs." };

test("caps every field, trims, and uses exactly the four keys", () => {
  const meta = JSON.parse(buildAgentMetadata({ ...DETAILS, jobDescription: "x".repeat(5000) }, "Omar Khaled"));
  assert.deepEqual(Object.keys(meta).sort(), ["candidate_name", "company", "job_description", "role"]);
  assert.equal(meta.role, "Back End Developer");
  assert.equal(meta.company, "Khazna");
  assert.equal(meta.job_description.length, INTERVIEW_LIMITS.jobDescription);
  assert.equal(INTERVIEW_LIMITS.jobDescription, 4000);
  assert.equal(JSON.parse(buildAgentMetadata({ ...DETAILS, role: "r".repeat(300) }, "x".repeat(200))).candidate_name.length, 80);
});

test("no name falls back to the candidate", () => {
  assert.equal(JSON.parse(buildAgentMetadata(DETAILS, null)).candidate_name, "the candidate");
  assert.equal(JSON.parse(buildAgentMetadata(DETAILS, "   ")).candidate_name, "the candidate");
});

test("canStart needs all three", () => {
  assert.equal(canStart(DETAILS), true);
  assert.equal(canStart({ ...DETAILS, company: " " }), false);
  assert.equal(canStart({ ...DETAILS, jobDescription: "" }), false);
  assert.equal(canStart({ ...DETAILS, role: "" }), false);
});
