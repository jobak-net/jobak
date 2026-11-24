import assert from "node:assert/strict";
import { test } from "node:test";

import { callStatusText, elapsedText } from "./call-copy";
import { initialCall } from "./call-state";

test("each ending reads as the spec's copy", () => {
  const ended = (end: NonNullable<typeof initialCall.end>) => callStatusText({ ...initialCall, phase: "ended", end });
  assert.equal(ended("mic-denied"), "Allow the microphone to practise. Your browser asks once.");
  assert.equal(ended("dropped"), "The call dropped.");
  assert.match(ended("agent-missing"), /^The interviewer didn't join\. Check the agent name/);
  assert.equal(ended("token-rejected"), "LiveKit didn't accept this token server ID. Check it in LiveKit › Settings.");
  assert.equal(ended("network"), "LiveKit couldn't be reached. Check your connection.");
});

test("live status follows the interviewer's state", () => {
  assert.equal(callStatusText({ ...initialCall, phase: "live", agent: "speaking" }), "Interviewer is speaking");
  assert.equal(callStatusText({ ...initialCall, phase: "live", agent: "listening" }), "Listening to you");
});

test("elapsed time reads minutes and seconds", () => {
  assert.equal(elapsedText(247_900), "4:07");
  assert.equal(elapsedText(-5), "0:00");
});

test("a finished interview says so", () => {
  assert.equal(callStatusText({ ...initialCall, phase: "ended", end: "finished" }), "The interviewer ended the interview.");
});

test("finishing and the feedback endings have their own copy", () => {
  assert.equal(callStatusText({ ...initialCall, phase: "finishing" }), "Writing your feedback…");
  assert.equal(callStatusText({ ...initialCall, phase: "ended", end: "evaluated" }), "Interview finished. Your feedback is ready.");
  assert.match(callStatusText({ ...initialCall, phase: "ended", end: "no-evaluation" }), /didn't send feedback/);
});
