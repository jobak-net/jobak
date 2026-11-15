import type { JobPreferences } from "@/shared/contracts/preferences";
import { applySearchRules } from "@/shared/preferences/search-rules";

/**
 * A change to the draft: the fields to set, or a pure function of the current
 * draft that returns them. The function form lets the UI hand out handlers
 * that never change (a toggle reads the list it toggles from the draft, not
 * from a closure), so unchanged options can skip re-rendering.
 */
export type DraftPatch = Partial<JobPreferences> | ((draft: JobPreferences) => Partial<JobPreferences>);

/**
 * Applies a change to a draft. Every change goes through the search rules, so
 * the draft is always valid in shape — ticking "anywhere" immediately becomes
 * remote-only. Shared by the onboarding flow and the dashboard's Preferences
 * page, so both edit answers by exactly the same rules.
 */
export function applyDraftPatch(draft: JobPreferences, patch: DraftPatch): JobPreferences {
    const fields = typeof patch === "function" ? patch(draft) : patch;
    return applySearchRules({ ...draft, ...fields });
}
