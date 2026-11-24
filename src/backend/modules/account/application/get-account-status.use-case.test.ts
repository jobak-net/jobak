import assert from "node:assert/strict";
import { test } from "node:test";

import { GetAccountStatusUseCase } from "./get-account-status.use-case";

test("returns the signed-in user's id with their name and email", async () => {
  const useCase = new GetAccountStatusUseCase({
    currentUser: async () => ({ id: "u-1", fullName: "Omar Khaled", email: "omar@example.com" }),
    hasCompletedOnboarding: async () => true,
  });

  assert.deepEqual(await useCase.execute(), {
    user: { id: "u-1", fullName: "Omar Khaled", email: "omar@example.com" },
    onboarded: true,
  });
});

test("returns null when nobody is signed in", async () => {
  const useCase = new GetAccountStatusUseCase({
    currentUser: async () => null,
    hasCompletedOnboarding: async () => true,
  });

  assert.equal(await useCase.execute(), null);
});
