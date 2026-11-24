import assert from "node:assert/strict";
import { test } from "node:test";

import { applyTranscriptPiece, transcriptText, type TranscriptLine } from "./transcript";

const apply = (pieces: Parameters<typeof applyTranscriptPiece>[1][]) => pieces.reduce<TranscriptLine[]>(applyTranscriptPiece, []);

test("interim then final replaces the text", () => {
  const lines = apply([
    { segmentId: "s1", speaker: "interviewer", text: "Tell me", final: false },
    { segmentId: "s1", speaker: "interviewer", text: "Tell me about yourself.", final: true },
  ]);
  assert.deepEqual(lines, [{ id: "s1", speaker: "interviewer", text: "Tell me about yourself.", final: true }]);
});

test("a late interim never overwrites a final", () => {
  const lines = apply([
    { segmentId: "s1", speaker: "you", text: "I built the API.", final: true },
    { segmentId: "s1", speaker: "you", text: "I built", final: false },
  ]);
  assert.equal(lines[0].text, "I built the API.");
  assert.equal(lines[0].final, true);
});

test("lines keep first-seen order across speakers", () => {
  const lines = apply([
    { segmentId: "a", speaker: "interviewer", text: "Q1", final: false },
    { segmentId: "b", speaker: "you", text: "A1", final: false },
    { segmentId: "a", speaker: "interviewer", text: "Question one?", final: true },
  ]);
  assert.deepEqual(lines.map((l) => l.id), ["a", "b"]);
});

test("empty pieces add nothing", () => {
  assert.deepEqual(apply([{ segmentId: "a", speaker: "you", text: "   ", final: false }]), []);
});

test("transcriptText labels speakers", () => {
  const lines = apply([
    { segmentId: "a", speaker: "interviewer", text: "Why us?", final: true },
    { segmentId: "b", speaker: "you", text: "Your product.", final: true },
  ]);
  assert.equal(transcriptText(lines), "Interviewer: Why us?\nYou: Your product.");
});
