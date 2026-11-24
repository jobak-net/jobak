import assert from "node:assert/strict";
import { test } from "node:test";

import { callReducer, initialCall, type CallAction, type CallState } from "./call-state";

const run = (actions: CallAction[], from: CallState = initialCall) => actions.reduce(callReducer, from);

test("mic denied ends before connecting", () => {
  const state = run([{ type: "start" }, { type: "mic-denied" }]);
  assert.equal(state.phase, "ended");
  assert.equal(state.end, "mic-denied");
  assert.equal(state.startedAt, null);
});

test("connected waits for the agent, agent-joined goes live", () => {
  let state = run([{ type: "start" }, { type: "mic-ok" }, { type: "connected", at: 1000 }]);
  assert.equal(state.phase, "waiting-agent");
  assert.equal(state.startedAt, 1000);
  state = callReducer(state, { type: "agent-joined" });
  assert.equal(state.phase, "live");
});

test("no agent in 30 s is agent-missing", () => {
  const waiting = run([{ type: "start" }, { type: "mic-ok" }, { type: "connected", at: 1 }]);
  assert.deepEqual([callReducer(waiting, { type: "timeout" }).phase, callReducer(waiting, { type: "timeout" }).end], ["ended", "agent-missing"]);
  const live = callReducer(waiting, { type: "agent-joined" });
  assert.equal(callReducer(live, { type: "timeout" }).phase, "live", "a timeout after the agent joined is ignored");
});

test("disconnect during a call keeps it ended with dropped", () => {
  const state = run([{ type: "start" }, { type: "mic-ok" }, { type: "connected", at: 1 }, { type: "agent-joined" }, { type: "ended", reason: "dropped" }]);
  assert.equal(state.phase, "ended");
  assert.equal(state.end, "dropped");
});

test("user end wins over a later dropped", () => {
  const state = run([{ type: "start" }, { type: "mic-ok" }, { type: "connected", at: 1 }, { type: "ended", reason: "user" }, { type: "ended", reason: "dropped" }]);
  assert.equal(state.end, "user");
});

test("agent-state only applies while live", () => {
  const waiting = run([{ type: "start" }, { type: "mic-ok" }, { type: "connected", at: 1 }]);
  assert.equal(callReducer(waiting, { type: "agent-state", state: "speaking" }).agent, null);
  const live = callReducer(waiting, { type: "agent-joined" });
  assert.equal(callReducer(live, { type: "agent-state", state: "speaking" }).agent, "speaking");
});

test("starting again clears the last call", () => {
  const ended = run([{ type: "start" }, { type: "mic-denied" }]);
  const again = callReducer(ended, { type: "start" });
  assert.deepEqual([again.phase, again.end, again.muted], ["mic", null, false]);
});

test("mute toggles only during a call", () => {
  const live = run([{ type: "start" }, { type: "mic-ok" }, { type: "connected", at: 1 }, { type: "agent-joined" }]);
  assert.equal(callReducer(live, { type: "mute", on: true }).muted, true);
  assert.equal(callReducer(initialCall, { type: "mute", on: true }).muted, false);
});

test("the interviewer finishing reads as finished, not dropped", () => {
  const live = run([{ type: "start" }, { type: "mic-ok" }, { type: "connected", at: 1 }, { type: "agent-joined" }]);
  const state = run([{ type: "ended", reason: "finished" }, { type: "ended", reason: "dropped" }], live);
  assert.equal(state.end, "finished");
});

test("blocked audio is tracked during a call and cleared on a new one", () => {
  const live = run([{ type: "start" }, { type: "mic-ok" }, { type: "connected", at: 1 }, { type: "agent-joined" }]);
  const blocked = callReducer(live, { type: "audio-blocked", on: true });
  assert.equal(blocked.audioBlocked, true);
  assert.equal(callReducer(blocked, { type: "audio-blocked", on: false }).audioBlocked, false);
  const again = run([{ type: "ended", reason: "user" }, { type: "start" }], blocked);
  assert.equal(again.audioBlocked, false);
});

test("finishing waits for feedback, then ends evaluated or without it", () => {
  const live = run([{ type: "start" }, { type: "mic-ok" }, { type: "connected", at: 1 }, { type: "agent-joined" }]);
  const finishing = callReducer(live, { type: "finishing" });
  assert.equal(finishing.phase, "finishing");
  assert.equal(callReducer(finishing, { type: "agent-state", state: "speaking" }).agent, "speaking", "the goodbye still shows");
  assert.equal(callReducer(finishing, { type: "ended", reason: "evaluated" }).end, "evaluated");
  assert.equal(callReducer(finishing, { type: "ended", reason: "no-evaluation" }).end, "no-evaluation");
  const waiting = run([{ type: "start" }, { type: "mic-ok" }, { type: "connected", at: 1 }]);
  assert.equal(callReducer(waiting, { type: "finishing" }).phase, "waiting-agent", "nothing to finish before the interviewer is here");
});
