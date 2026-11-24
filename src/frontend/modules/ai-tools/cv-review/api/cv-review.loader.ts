import "server-only";

import { requireDashboardUser } from "@/frontend/modules/dashboard/server";
import { loadAiSettings } from "@/frontend/modules/settings/server";
import { serverFetch } from "@/frontend/shared/api/server";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";
import type { SavedCv } from "@/shared/contracts/applicant";
import { PREFERENCES_API_PATH, type SavedPreferencesResponse } from "@/shared/contracts/preferences";
import { skillApiPath, type SkillVersionsResponse } from "@/shared/contracts/skills";

import { loadApplicant } from "../../api/applicant.loader";

export interface CvReviewPage {
  /** The tool opens once an AI key is saved (or when that couldn't be checked — see `loadAiAccess`). */
  unlocked: boolean;
  defaults: {
    /** The first job title in Preferences, editable in the form. Empty without one. */
    targetRole: string;
    /** The name on applications (or the account's), for the improved CV's file name. */
    name: string;
  };
  /** The user's saved CVs, most recently used first; empty when there are none or they can't be read. */
  savedCvs: SavedCv[];
  /** For the provider popup. Null when unreadable. */
  ai: AiSettingsResponse | null;
  /** The CV review skill's versions, for "Use in your own AI". Null when unreadable: the button isn't shown. */
  skill: SkillVersionsResponse | null;
}

/**
 * What /dashboard/cv-review renders with, read on the server in parallel:
 * the account (its name), AI settings (the lock and the popup's keys),
 * Preferences (the target role's default), the skill's versions, and the
 * applicant's saved name and CVs. A read that fails only leaves its part
 * empty.
 */
export async function loadCvReviewPage(): Promise<CvReviewPage> {
  const [user, ai, preferences, skill, applicant] = await Promise.all([
    requireDashboardUser(),
    loadAiSettings(),
    serverFetch<SavedPreferencesResponse>(PREFERENCES_API_PATH),
    serverFetch<SkillVersionsResponse>(skillApiPath("cv-review")),
    loadApplicant(),
  ]);

  return {
    unlocked: ai === null || ai.connected.length > 0,
    defaults: {
      targetRole: (preferences.kind === "ok" && preferences.data.preferences?.jobTitles[0]) || "",
      name: applicant?.name ?? user.fullName ?? "",
    },
    ai,
    skill: skill.kind === "ok" ? skill.data : null,
    savedCvs: applicant?.cvs ?? [],
  };
}
