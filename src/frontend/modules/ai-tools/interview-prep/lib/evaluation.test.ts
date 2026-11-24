import assert from "node:assert/strict";
import { test } from "node:test";

import { EVALUATION_TOOL, parseEvaluation } from "./evaluation";

const MISTAKES = [{ said: "I just did what I was told.", why: "Sounds passive.", better: "I proposed and led the change to…" }];

test("reads the tool's arguments, with the mistakes as JSON text", () => {
  const payload = JSON.stringify({
    score: 7,
    summary: "Clear, but light on results.",
    strengths: "- Good structure\n- Calm delivery",
    mistakes: JSON.stringify(MISTAKES),
  });
  assert.deepEqual(parseEvaluation(payload), {
    score: 7,
    summary: "Clear, but light on results.",
    strengths: ["Good structure", "Calm delivery"],
    mistakes: MISTAKES,
  });
});

test("accepts arguments nested under `arguments`, mistakes as a real array, and fenced JSON", () => {
  assert.deepEqual(parseEvaluation(JSON.stringify({ arguments: { score: "8", summary: "Good", strengths: "", mistakes: MISTAKES } }))?.mistakes, MISTAKES);
  const fenced = "```json\n" + JSON.stringify(MISTAKES) + "\n```";
  assert.deepEqual(parseEvaluation(JSON.stringify({ summary: "x", mistakes: fenced }))?.mistakes, MISTAKES);
});

test("keeps unreadable mistakes as text instead of losing them", () => {
  const evaluation = parseEvaluation(JSON.stringify({ summary: "x", mistakes: "You rambled on the first question." }));
  assert.deepEqual(evaluation?.mistakes, [{ said: "", why: "You rambled on the first question.", better: "" }]);
});

test("score is a whole number from 1 to 10, or null", () => {
  assert.equal(parseEvaluation(JSON.stringify({ summary: "x", score: 7.6 }))?.score, 8);
  assert.equal(parseEvaluation(JSON.stringify({ summary: "x", score: 42 }))?.score, 10);
  assert.equal(parseEvaluation(JSON.stringify({ summary: "x", score: "great" }))?.score, null);
});

test("nothing usable, or not JSON, reads as null", () => {
  assert.equal(parseEvaluation("not json"), null);
  assert.equal(parseEvaluation(JSON.stringify({ summary: " ", strengths: "", mistakes: "[]" })), null);
});

test("the tool's parameters are what the parser reads", () => {
  assert.equal(EVALUATION_TOOL.name, "submit_evaluation");
  assert.deepEqual(
    EVALUATION_TOOL.parameters.map((p) => p.name),
    ["score", "summary", "strengths", "mistakes"],
  );
});
