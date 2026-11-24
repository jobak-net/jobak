import assert from "node:assert/strict";
import { test } from "node:test";

import { feedbackText } from "./evaluation-pdf";

const FEEDBACK = {
  details: { role: "Back End Developer", company: "Khazna", jobDescription: "Payments APIs." },
  evaluation: {
    score: 6,
    summary: "Good basics, thin on results.",
    strengths: ["Clear structure"],
    mistakes: [{ said: "I just fixed bugs.", why: "Undersells your work.", better: "I cut payout failures by 30%…" }],
  },
  lines: [
    { id: "1", speaker: "interviewer" as const, text: "Tell me about yourself.", final: true },
    { id: "2", speaker: "you" as const, text: "I just fixed bugs.", final: true },
  ],
  candidateName: "Omar",
  date: new Date("2026-11-24T10:00:00Z"),
};

test("the feedback reads in order: who, score, summary, strengths, mistakes, transcript", () => {
  const text = feedbackText(FEEDBACK);
  const order = ["Interview feedback", "Back End Developer at Khazna", "Score: 6/10", "Good basics", "What went well", "Mistakes to fix", 'You said: "I just fixed bugs."', "A better answer:", "Transcript", "Interviewer: Tell me about yourself."];
  let at = -1;
  for (const part of order) {
    const next = text.indexOf(part, at + 1);
    assert.ok(next > at, `"${part}" should come after the previous part`);
    at = next;
  }
});

test("empty parts are left out", () => {
  const text = feedbackText({ ...FEEDBACK, evaluation: { score: null, summary: "Fine.", strengths: [], mistakes: [] }, lines: [] });
  assert.ok(!text.includes("Score:"));
  assert.ok(!text.includes("What went well"));
  assert.ok(!text.includes("Transcript"));
});
