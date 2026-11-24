import assert from "node:assert/strict";
import { test } from "node:test";

import { looksLikeUrl, projectHost, readLiveKitSettings, removeLiveKitSettings, saveLiveKitSettings } from "./livekit-settings";
import { blockedStorage, memoryStorage } from "./test-storage";

const SETTINGS = { tokenServerId: "ts-123", agentName: "jobak-interviewer" };

test("keys by account", () => {
  const storage = memoryStorage();
  assert.equal(saveLiveKitSettings("a", SETTINGS, storage), true);
  assert.deepEqual(readLiveKitSettings("a", storage), { state: "saved", settings: SETTINGS });
  assert.deepEqual(readLiveKitSettings("b", storage), { state: "none" });
  assert.ok(storage.getItem("jobak.livekit.a"));
});

test("saves trimmed values and rejects blanks", () => {
  const storage = memoryStorage();
  assert.equal(saveLiveKitSettings("a", { tokenServerId: "  ts-1  ", agentName: " agent " }, storage), true);
  assert.deepEqual(readLiveKitSettings("a", storage), { state: "saved", settings: { tokenServerId: "ts-1", agentName: "agent" } });
  assert.equal(saveLiveKitSettings("b", { tokenServerId: "ts-1", agentName: "  " }, storage), false);
  assert.deepEqual(readLiveKitSettings("b", storage), { state: "none" });
});

test("malformed JSON reads as none", () => {
  const storage = memoryStorage();
  storage.setItem("jobak.livekit.a", "{nope");
  assert.deepEqual(readLiveKitSettings("a", storage), { state: "none" });
  storage.setItem("jobak.livekit.a", JSON.stringify({ tokenServerId: 5, agentName: "x" }));
  assert.deepEqual(readLiveKitSettings("a", storage), { state: "none" });
});

test("blocked storage reads as blocked", () => {
  const storage = blockedStorage();
  assert.deepEqual(readLiveKitSettings("a", storage), { state: "blocked" });
  assert.equal(saveLiveKitSettings("a", SETTINGS, storage), false);
  assert.doesNotThrow(() => removeLiveKitSettings("a", storage));
});

test("remove clears only that account", () => {
  const storage = memoryStorage();
  saveLiveKitSettings("a", SETTINGS, storage);
  saveLiveKitSettings("b", SETTINGS, storage);
  removeLiveKitSettings("a", storage);
  assert.deepEqual(readLiveKitSettings("a", storage), { state: "none" });
  assert.equal(readLiveKitSettings("b", storage).state, "saved");
});

test("keeps the project URL LiveKit returned, and drops anything that isn't one", () => {
  const storage = memoryStorage();
  saveLiveKitSettings("a", { ...SETTINGS, serverUrl: " wss://job-abc.livekit.cloud " }, storage);
  assert.deepEqual(readLiveKitSettings("a", storage), { state: "saved", settings: { ...SETTINGS, serverUrl: "wss://job-abc.livekit.cloud" } });
  saveLiveKitSettings("b", { ...SETTINGS, serverUrl: "not a url" }, storage);
  assert.deepEqual(readLiveKitSettings("b", storage), { state: "saved", settings: SETTINGS });
});

test("projectHost shows the project's address without the scheme", () => {
  assert.equal(projectHost("wss://job-abc.livekit.cloud"), "job-abc.livekit.cloud");
  assert.equal(projectHost("https://job-abc.livekit.cloud/"), "job-abc.livekit.cloud");
  assert.equal(projectHost(undefined), null);
  assert.equal(projectHost("nope"), null);
});

test("looksLikeUrl spots a pasted URL instead of the token server ID", () => {
  assert.equal(looksLikeUrl("https://cloud-api.livekit.io/api/v2/sandbox/connection-details"), true);
  assert.equal(looksLikeUrl("cloud-api.livekit.io/api/v2/sandbox/connection-details"), true);
  assert.equal(looksLikeUrl("wss://job-abc.livekit.cloud"), true);
  assert.equal(looksLikeUrl("job-2b2ueg"), false);
  assert.equal(looksLikeUrl("  "), false);
});
