import assert from "node:assert/strict";
import { test } from "node:test";

import type { CallAction } from "./call-state";
import type { InterviewEvaluation } from "./evaluation";
import { createInterviewSession, type RoomLike, type SessionDeps } from "./interview-session";
import type { TranscriptPiece } from "./transcript";

const SETTINGS = { tokenServerId: "ts", agentName: "jobak-interviewer" };
const DETAILS = { role: "Back End Developer", company: "Khazna", jobDescription: "Payments APIs." };

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

class FakeRoom {
  handlers = new Map<string, ((...args: unknown[]) => void)[]>();
  textHandler: ((reader: unknown, info: { identity: string }) => void) | null = null;
  rpcHandlers = new Map<string, (data: { payload: string }) => Promise<string>>();
  sentTexts: { text: string; topic?: string }[] = [];
  sendTextFails = false;
  connectGate = deferred();
  connected = false;
  disconnects = 0;
  micCalls: boolean[] = [];
  startAudioCalls = 0;
  remoteParticipants = new Map<string, unknown>();
  localParticipant = {
    trackPublications: new Map<string, unknown>([["TR_mic", {}]]),
    setMicrophoneEnabled: async (on: boolean) => void this.micCalls.push(on),
    sendText: async (text: string, options?: { topic?: string }) => {
      if (this.sendTextFails) throw new Error("not connected");
      this.sentTexts.push({ text, topic: options?.topic });
    },
  };
  registerRpcMethod(method: string, handler: (data: { payload: string }) => Promise<string>) {
    this.rpcHandlers.set(method, handler);
  }
  on(event: string, fn: (...args: unknown[]) => void) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), fn]);
    return this;
  }
  emit(event: string, ...args: unknown[]) {
    for (const fn of this.handlers.get(event) ?? []) fn(...args);
  }
  registerTextStreamHandler(_topic: string, fn: (reader: unknown, info: { identity: string }) => void) {
    this.textHandler = fn;
  }
  async connect() {
    await this.connectGate.promise;
    this.connected = true;
  }
  async disconnect() {
    this.disconnects++;
    this.connected = false;
  }
  async startAudio() {
    this.startAudioCalls++;
  }
}

function setup(overrides: Partial<SessionDeps> = {}) {
  const rooms: FakeRoom[] = [];
  const actions: CallAction[] = [];
  const evaluations: InterviewEvaluation[] = [];
  const pieces: TranscriptPiece[] = [];
  const timers: (() => void)[] = [];
  const attached: string[] = [];
  const detached: string[] = [];
  let tokenCalls = 0;
  const deps: SessionDeps = {
    requestMic: async () => {},
    fetchToken: async () => {
      tokenCalls++;
      return { serverUrl: "wss://x", participantToken: "t" };
    },
    createRoom: () => {
      const room = new FakeRoom();
      room.connectGate.resolve();
      rooms.push(room);
      return room as unknown as RoomLike;
    },
    setTimer: (fn) => timers.push(fn),
    clearTimer: () => {},
    now: () => 1000,
    attachAudio: (track) => {
      attached.push((track as { sid: string }).sid);
      return () => detached.push((track as { sid: string }).sid);
    },
    isNormalDisconnect: (reason) => reason === "room-deleted" || reason === "client",
    ...overrides,
  };
  const session = createInterviewSession({
    deps,
    settings: SETTINGS,
    onAction: (a) => actions.push(a),
    onTranscript: (p) => pieces.push(p),
    onEvaluation: (e) => evaluations.push(e),
  });
  return { session, rooms, actions, pieces, evaluations, timers, attached, detached, tokenCalls: () => tokenCalls };
}

const agent = { identity: "agent-1", isAgent: true, attributes: { "lk.agent.state": "listening" } };
const audioTrack = (sid: string) => ({ sid, kind: "audio" });

test("end while waiting for the mic starts nothing", async () => {
  const mic = deferred();
  const t = setup({ requestMic: () => mic.promise });
  const started = t.session.start(DETAILS, "Omar");
  t.session.end();
  mic.resolve();
  await started;
  assert.equal(t.tokenCalls(), 0);
  assert.equal(t.rooms.length, 0);
});

test("end while the token is fetched never creates a room", async () => {
  const token = deferred<{ serverUrl: string; participantToken: string }>();
  const t = setup({ fetchToken: () => token.promise });
  const started = t.session.start(DETAILS, "Omar");
  await tick();
  t.session.end();
  token.resolve({ serverUrl: "wss://x", participantToken: "t" });
  await started;
  assert.equal(t.rooms.length, 0);
});

test("end while connecting disconnects the room and never turns the mic on", async () => {
  const rooms: FakeRoom[] = [];
  const t = setup({
    createRoom: () => {
      const room = new FakeRoom();
      rooms.push(room);
      return room as unknown as RoomLike;
    },
  });
  const started = t.session.start(DETAILS, "Omar");
  await tick();
  t.session.end();
  rooms[0].connectGate.resolve();
  await started;
  assert.ok(rooms[0].disconnects >= 1, "the room is disconnected once it connects");
  assert.deepEqual(rooms[0].micCalls, [], "the mic is never turned on");
});

test("a second start disconnects the first call and ignores its events", async () => {
  const t = setup();
  await t.session.start(DETAILS, "Omar");
  const first = t.rooms[0];
  await t.session.start(DETAILS, "Omar");
  assert.ok(first.disconnects >= 1);
  const before = t.actions.length;
  first.emit("participantConnected", agent);
  assert.equal(t.actions.length, before, "the old room's events don't reach the new call");
});

test("the interviewer's audio is played, and stopped when it goes", async () => {
  const t = setup();
  await t.session.start(DETAILS, "Omar");
  t.rooms[0].emit("trackSubscribed", audioTrack("TR_agent_audio"));
  t.rooms[0].emit("trackSubscribed", { sid: "TR_video", kind: "video" });
  assert.deepEqual(t.attached, ["TR_agent_audio"]);
  t.rooms[0].emit("trackUnsubscribed", audioTrack("TR_agent_audio"));
  assert.deepEqual(t.detached, ["TR_agent_audio"]);
});

test("ending the call stops playing the interviewer's audio", async () => {
  const t = setup();
  await t.session.start(DETAILS, "Omar");
  t.rooms[0].emit("trackSubscribed", audioTrack("TR_agent_audio"));
  t.session.end();
  assert.deepEqual(t.detached, ["TR_agent_audio"]);
});

test("audio the browser blocks is reported, and enableAudio starts it", async () => {
  const t = setup();
  await t.session.start(DETAILS, "Omar");
  t.rooms[0].emit("audioPlaybackChanged", false);
  assert.deepEqual(t.actions.at(-1), { type: "audio-blocked", on: true });
  await t.session.enableAudio();
  assert.equal(t.rooms[0].startAudioCalls, 1);
});

test("a final flag in the stream's trailer marks the line final", async () => {
  const t = setup();
  await t.session.start(DETAILS, "Omar");
  const info = { id: "s", attributes: { "lk.segment_id": "seg-1", "lk.transcription_final": "false" } as Record<string, string> };
  const reader = {
    info,
    async *[Symbol.asyncIterator]() {
      yield "Hello, ";
      yield "shall we begin?";
      info.attributes = { ...info.attributes, "lk.transcription_final": "true" }; // the trailer replaces the object
    },
  };
  t.rooms[0].textHandler?.(reader, { identity: "agent-1" });
  await tick();
  await tick();
  assert.deepEqual(t.pieces.at(-1), { segmentId: "seg-1", speaker: "interviewer", text: "Hello, shall we begin?", final: true });
});

test("a transcript stream that breaks keeps what arrived, with no unhandled error", async () => {
  const t = setup();
  await t.session.start(DETAILS, "Omar");
  const reader = {
    info: { id: "s", attributes: { "lk.segment_id": "seg-2" } },
    async *[Symbol.asyncIterator]() {
      yield "Tell me";
      throw new Error("stream reset");
    },
  };
  t.rooms[0].textHandler?.(reader, { identity: "agent-1" });
  await tick();
  await tick();
  assert.equal(t.pieces.at(-1)?.text, "Tell me");
});

test("the interviewer leaving ends the call as finished and hangs up", async () => {
  const t = setup();
  await t.session.start(DETAILS, "Omar");
  t.rooms[0].emit("participantConnected", agent);
  t.rooms[0].emit("participantDisconnected", agent);
  assert.deepEqual(t.actions.at(-1), { type: "ended", reason: "finished" });
  assert.ok(t.rooms[0].disconnects >= 1);
});

test("a deleted room reads as finished, a lost connection as dropped", async () => {
  const a = setup();
  await a.session.start(DETAILS, "Omar");
  a.rooms[0].emit("disconnected", "room-deleted");
  assert.deepEqual(a.actions.at(-1), { type: "ended", reason: "finished" });

  const b = setup();
  await b.session.start(DETAILS, "Omar");
  b.rooms[0].emit("disconnected", "network");
  assert.deepEqual(b.actions.at(-1), { type: "ended", reason: "dropped" });
});

test("no interviewer in time hangs up as agent-missing", async () => {
  const t = setup();
  await t.session.start(DETAILS, "Omar");
  t.timers.at(-1)?.();
  assert.deepEqual(t.actions.at(-1), { type: "timeout" });
  assert.ok(t.rooms[0].disconnects >= 1);
});

test("dispose hangs up a call that is still starting", async () => {
  const mic = deferred();
  const t = setup({ requestMic: () => mic.promise });
  const started = t.session.start(DETAILS, "Omar");
  t.session.dispose();
  mic.resolve();
  await started;
  assert.equal(t.rooms.length, 0);
});

const EVALUATION = JSON.stringify({ score: 7, summary: "Solid.", strengths: "Clear", mistakes: "[]" });

async function liveCall() {
  const t = setup();
  await t.session.start(DETAILS, "Omar");
  const room = t.rooms[0];
  room.emit("participantConnected", agent);
  return { ...t, room };
}

test("the interviewer's evaluation reaches the page, and the agent hears it arrived", async () => {
  const t = await liveCall();
  const reply = await t.room.rpcHandlers.get("submit_evaluation")!({ payload: EVALUATION });
  assert.equal(t.evaluations[0]?.score, 7);
  assert.match(reply, /received/i);
  assert.equal(t.room.disconnects, 0, "sent on its own, mid-call: the call goes on");
});

test("an unreadable evaluation is refused, so the interviewer can send it again", async () => {
  const t = await liveCall();
  await assert.rejects(t.room.rpcHandlers.get("submit_evaluation")!({ payload: "{}" }), /couldn't be read/);
  assert.equal(t.evaluations.length, 0);
});

test("finish asks the interviewer to wrap up, mutes the mic, and hangs up once the evaluation arrives", async () => {
  const t = await liveCall();
  const timersBefore = t.timers.length;
  t.session.finishWithFeedback();
  await tick();
  assert.deepEqual(t.actions.at(-1), { type: "finishing" });
  assert.equal(t.room.sentTexts[0]?.topic, "lk.chat");
  assert.equal(t.room.micCalls.at(-1), false);
  await t.room.rpcHandlers.get("submit_evaluation")!({ payload: EVALUATION });
  // A short pause lets the reply reach the agent; then the call ends as evaluated.
  t.timers.at(-1)!();
  assert.deepEqual(t.actions.at(-1), { type: "ended", reason: "evaluated" });
  assert.equal(t.room.disconnects, 1);
  assert.ok(t.timers.length > timersBefore);
});

test("no evaluation in time ends the call without feedback", async () => {
  const t = await liveCall();
  t.session.finishWithFeedback();
  await tick();
  t.timers.at(-1)!();
  assert.deepEqual(t.actions.at(-1), { type: "ended", reason: "no-evaluation" });
  assert.equal(t.room.disconnects, 1);
});

test("a wrap-up message that can't be sent ends the call without feedback", async () => {
  const t = await liveCall();
  t.room.sendTextFails = true;
  t.session.finishWithFeedback();
  await tick();
  assert.deepEqual(t.actions.at(-1), { type: "ended", reason: "no-evaluation" });
});

test("an evaluation after the call ended is ignored", async () => {
  const t = await liveCall();
  t.session.end();
  await t.room.rpcHandlers.get("submit_evaluation")!({ payload: EVALUATION });
  assert.equal(t.evaluations.length, 0);
});
