import "server-only";

import { requireDashboardUser } from "@/frontend/modules/dashboard/server";
import { loadAiSettings } from "@/frontend/modules/settings/server";
import { serverFetch } from "@/frontend/shared/api/server";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";
import type { SavedCv } from "@/shared/contracts/applicant";
import { skillApiPath, type SkillVersionsResponse } from "@/shared/contracts/skills";

import { loadApplicant } from "../../api/applicant.loader";

export interface CvTailorPage {
  /** The tool opens once an AI key is saved (or when that couldn't be checked — see `loadAiAccess`). */
  unlocked: boolean;
  /** The name on applications (or the account's), for the tailored CV's file name. */
  name: string;
  /** The user's saved CVs, most recently used first; empty when there are none or they can't be read. */
  savedCvs: SavedCv[];
  /** For the provider popup. Null when unreadable. */
  ai: AiSettingsResponse | null;
  /** The CV tailoring skill's versions, for "Use in your own AI". Null when unreadable: the button isn't shown. */
  skill: SkillVersionsResponse | null;
}

/**
 * What /dashboard/cv-tailor renders with, read on the server in parallel:
 * the account and the applicant (the name, the saved CVs), AI settings (the
 * lock and the popup's keys) and the skill's versions. A read that fails only
 * leaves its part empty.
 */
export async function loadCvTailorPage(): Promise<CvTailorPage> {
  const [user, ai, skill, applicant] = await Promise.all([
    requireDashboardUser(),
    loadAiSettings(),
    serverFetch<SkillVersionsResponse>(skillApiPath("cv-tailor")),
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
