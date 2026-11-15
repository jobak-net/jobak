import type { JobPreferences } from "@/shared/contracts/preferences";
import type { StepId } from "@/shared/onboarding/step-rules";
import { applySearchRules, EMPTY_PREFERENCES } from "@/shared/preferences/search-rules";

/**
 * Onboarding answers kept in this browser until they're saved, so a refresh
 * (or closing the tab) picks up where the user left off instead of starting
 * over.
 *
 * A convenience, not storage: `localStorage` can be empty, blocked or throw
 * (private windows, blocked site data), so every access is guarded and the
 * flow works the same without it. The server copy only exists once the user
 * finishes.
 *
 * One entry per account (the key comes from the server, see
 * `loaders/onboarding.ts`), so someone else signing in on the same browser
 * doesn't get these answers.
 */

/** Bump when the stored shape changes; older entries are then ignored. */
const VERSION = 1;

export interface SavedProgress {
    draft: JobPreferences;
    stepId: StepId;
}

const strings = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

/**
 * The saved answers, or null. What was stored is untrusted — an old version, a
 * hand-edited entry — so it's rebuilt field by field and put through the search
 * rules, exactly like an edit.
 */
export function readProgress(key: string): SavedProgress | null {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;

        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null) return null;
        const { v, stepId, draft } = parsed as { v?: unknown; stepId?: unknown; draft?: unknown };
        if (v !== VERSION || typeof stepId !== "string" || typeof draft !== "object" || draft === null) return null;

        const d = draft as Record<string, unknown>;
        const location = (typeof d.location === "object" && d.location !== null ? d.location : {}) as Record<
            string,
            unknown
        >;

        return {
            stepId: stepId as StepId,
            draft: applySearchRules({
                ...EMPTY_PREFERENCES,
                location: { worldwide: location.worldwide === true, countries: strings(location.countries) },
                workModes: strings(d.workModes) as JobPreferences["workModes"],
                jobTitles: strings(d.jobTitles),
                keywords: strings(d.keywords),
                jobTypes: strings(d.jobTypes) as JobPreferences["jobTypes"],
                seniority: typeof d.seniority === "string" ? (d.seniority as JobPreferences["seniority"]) : null,
                field: typeof d.field === "string" ? d.field : null,
            }),
        };
    } catch {
        return null;
    }
}

export function writeProgress(key: string, progress: SavedProgress): void {
    try {
        window.localStorage.setItem(key, JSON.stringify({ v: VERSION, ...progress }));
    } catch {
        /* storage unavailable or full — the flow just won't resume after a refresh */
    }
}

export function clearProgress(key: string): void {
    try {
        window.localStorage.removeItem(key);
    } catch {
        /* nothing to clear */
    }
}
