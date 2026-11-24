import assert from "node:assert/strict";
import { test } from "node:test";

import { INTERVIEWER_GREETING, INTERVIEWER_INSTRUCTIONS, METADATA_KEYS } from "./interviewer-instructions";

const used = (text: string) => [...text.matchAll(/\{\{metadata\.([a-z_]+)\}\}/g)].map((m) => m[1]);

test("the instructions use exactly the metadata keys the page sends", () => {
  assert.deepEqual([...METADATA_KEYS].sort(), ["candidate_name", "company", "job_description", "role"]);
  for (const key of [...used(INTERVIEWER_INSTRUCTIONS), ...used(INTERVIEWER_GREETING)]) assert.ok(METADATA_KEYS.includes(key), key);
  for (const key of METADATA_KEYS) assert.ok(used(INTERVIEWER_INSTRUCTIONS).includes(key), `${key} in the instructions`);
});

test("the greeting names the role and company", () => {
  assert.ok(INTERVIEWER_GREETING.includes("{{metadata.role}}"));
  assert.ok(INTERVIEWER_GREETING.includes("{{metadata.company}}"));
});

test("the greeting reads well without a name", () => {
  assert.ok(!INTERVIEWER_GREETING.includes("{{metadata.candidate_name}}"), "an account without a name would hear 'Hello the candidate'");
});
