import "server-only";

import { requireDashboardUser } from "@/frontend/modules/dashboard/server";
import { loadAiSettings } from "@/frontend/modules/settings/server";
import { serverFetch } from "@/frontend/shared/api/server";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";
import type { SavedCv } from "@/shared/contracts/applicant";
import { skillApiPath, type SkillVersionsResponse } from "@/shared/contracts/skills";

import { loadApplicant } from "../../api/applicant.loader";

export interface HrEmailPage {
  /** The tool opens once an AI key is saved (or when that couldn't be checked — see `loadAiAccess`). */
  unlocked: boolean;
  /** What the name starts with: the name saved for applications, else the account's. */
  name: string;
  /** The user's saved CVs, most recently used first: one can be the email's source of experience. */
  savedCvs: SavedCv[];
  /** For the provider popup. Null when unreadable. */
  ai: AiSettingsResponse | null;
  /** The HR email skill's versions, for "Use in your own AI". Null when unreadable: the button isn't shown. */
  skill: SkillVersionsResponse | null;
}

/**
 * What /dashboard/hr-email renders with, read on the server in parallel:
 * the account and the applicant (the name, the saved CVs), AI settings (the
 * lock and the popup's keys) and the skill's versions. A read that fails only
 * leaves its part empty.
 */
export async function loadHrEmailPage(): Promise<HrEmailPage> {
  const [user, ai, skill, applicant] = await Promise.all([
    requireDashboardUser(),
    loadAiSettings(),
    serverFetch<SkillVersionsResponse>(skillApiPath("email-hr")),
    loadApplicant(),
  ]);

  return {
    unlocked: ai === null || ai.connected.length > 0,
    name: applicant?.name ?? user.fullName ?? "",
    savedCvs: applicant?.cvs ?? [],
    ai,
    skill: skill.kind === "ok" ? skill.data : null,
  };
}
