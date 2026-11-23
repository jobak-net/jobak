import "server-only";

import { requireDashboardUser } from "@/frontend/modules/dashboard/server";
import { loadAiSettings } from "@/frontend/modules/settings/server";
import { serverFetch } from "@/frontend/shared/api/server";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";
import { skillApiPath, type SkillVersionsResponse } from "@/shared/contracts/skills";

export interface CoverLetterPage {
  /** The tool opens once an AI key is saved (or when that couldn't be checked — see `loadAiAccess`). */
  unlocked: boolean;
  /** What the name field starts with: the account's name. */
  defaults: { name: string };
  /** For the provider popup: the saved keys, which one is in use, and the model each runs. Null when unreadable. */
  ai: AiSettingsResponse | null;
  /**
   * The cover letter skill's versions, for "Use in your own AI" (content is
   * fetched when the popup opens). Null when unreadable — the button is then
   * not shown.
   */
  skill: SkillVersionsResponse | null;
}

/**
 * What /dashboard/cover-letter renders with, read on the server in parallel:
 *
 *  - the account (`GET /api/v1/me`) → the name field's default;
 *  - AI settings (`GET /api/v1/ai-settings`) → the lock, and the popup's keys;
 *  - the skill's versions (`GET /api/v1/ai-tools/skills/cover-letter`) →
 *    "Use in your own AI" and its version dropdown.
 *
 * The rest of the profile (skills, target roles, seniority) the server reads
 * itself when it writes the letter.
 */
export async function loadCoverLetterPage(): Promise<CoverLetterPage> {
  const [user, ai, skill] = await Promise.all([
    requireDashboardUser(),
    loadAiSettings(),
    serverFetch<SkillVersionsResponse>(skillApiPath("cover-letter")),
  ]);

  return {
    unlocked: ai === null || ai.connected.length > 0,
    defaults: { name: user.fullName ?? "" },
    ai,
    skill: skill.kind === "ok" ? skill.data : null,
  };
}
