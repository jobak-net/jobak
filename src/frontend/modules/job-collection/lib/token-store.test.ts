import assert from "node:assert/strict";
import { test } from "node:test";

import { readToken, removeToken, saveToken } from "./token-store";
import { blockedStorage, memoryStorage } from "./test-storage";

test("keys by account", () => {
  const storage = memoryStorage();
  assert.equal(saveToken("a", "apify_api_one", storage), true);

  assert.deepEqual(readToken("a", storage), { state: "saved", token: "apify_api_one" });
  assert.deepEqual(readToken("b", storage), { state: "none" });
  assert.equal(storage.getItem("jobak.apify-token.a"), "apify_api_one");
});

test("blocked storage reads as blocked and can't save", () => {
  const storage = blockedStorage();
  assert.deepEqual(readToken("a", storage), { state: "blocked" });
  assert.equal(saveToken("a", "apify_api_one", storage), false);
  assert.doesNotThrow(() => removeToken("a", storage));
});

test("no storage at all reads as blocked", () => {
  assert.deepEqual(readToken("a", undefined), { state: "blocked" });
});

test("remove clears only that account", () => {
  const storage = memoryStorage();
  saveToken("a", "apify_api_one", storage);
  saveToken("b", "apify_api_two", storage);
  removeToken("a", storage);

  assert.deepEqual(readToken("a", storage), { state: "none" });
  assert.deepEqual(readToken("b", storage), { state: "saved", token: "apify_api_two" });
});

test("an empty saved value reads as none", () => {
  const storage = memoryStorage();
  storage.setItem("jobak.apify-token.a", "   ");
  assert.deepEqual(readToken("a", storage), { state: "none" });
});
