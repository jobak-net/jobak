import "server-only";

import { createHash } from "node:crypto";

import { serverFetch } from "@/frontend/lib/api/server-fetch";
import { describeSearch } from "@/frontend/lib/utils/describe-search";
import { firstNameOf } from "@/frontend/lib/utils/names";
import type { AccountStatus } from "@/shared/contracts/account";
import { JOB_FIELDS_API_PATH, type JobField } from "@/shared/contracts/job-catalogue";
import {
  PREFERENCES_API_PATH,
  type JobPreferences,
  type SavedPreferencesResponse,
} from "@/shared/contracts/preferences";

/*
 * What each onboarding page renders with, ready to spread onto its component.
 * The pages only wire guard → loader → component.
 *
 * Nothing here blocks the page on a failed read — `serverFetch` logs it, and
 * the step opens with less help instead of an error screen.
 */

type User = AccountStatus["user"];

async function loadSavedPreferences(): Promise<JobPreferences | null> {
  const result = await serverFetch<SavedPreferencesResponse>(PREFERENCES_API_PATH);
  return result.kind === "ok" ? result.data.preferences : null;
}

/**
 * Where this browser keeps the user's unsaved onboarding answers. One key per
 * account, so someone else signing in on the same browser starts clean. A short
 * hash rather than the email itself, so the address isn't written to storage.
 * With auth off there is one user, the local owner.
 */
function progressStorageKey(user: User): string {
  const who = user.email
    ? createHash("sha256").update(user.email.trim().toLowerCase()).digest("hex").slice(0, 16)
    : "local";
  return `jobak:onboarding:${who}`;
}

/** Props for `<OnboardingFlow>` on /onboarding. */
export async function loadOnboardingQuestions(user: User): Promise<{
  catalogue: JobField[];
  initial: JobPreferences | undefined;
  firstName: string | null;
  storageKey: string;
}> {
  const [fields, saved] = await Promise.all([
    serverFetch<JobField[]>(JOB_FIELDS_API_PATH),
    loadSavedPreferences(),
  ]);

  return {
    // Without fields the step still works: search needs none of this.
    catalogue: fields.kind === "ok" ? fields.data : [],
    // Returning here prefills the answers instead of starting over; unreadable
    // preferences just open it empty.
    initial: saved ?? undefined,
    firstName: firstNameOf(user.fullName),
    storageKey: progressStorageKey(user),
  };
}

/** Props for `<AiSetupFlow>` on /onboarding/ai. */
export async function loadAiSetup(user: User): Promise<{ summary: string; firstName: string | null }> {
  // Only for the summary line; a failed read just makes it generic.
  const saved = await loadSavedPreferences();
  return { summary: describeSearch(saved), firstName: firstNameOf(user.fullName) };
}
