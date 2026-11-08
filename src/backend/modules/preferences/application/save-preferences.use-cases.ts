import { parsePreferences, type JobPreferences, type StoredPreferences } from "../domain/job-preferences";
import { validateForCompletion, type StepId } from "../domain/onboarding";
import type { PreferencesRepository } from "../domain/preferences.repository";
import { unknownTitlesMessage, type TitleCatalogue } from "../domain/title-catalogue";

/**
 * A save's outcome. On success, `preferences` is what was stored — the input
 * after the search rules and with the catalogue's spelling of each title — so
 * a form can show exactly what the search will use.
 */
export type SaveResult =
    | { ok: true; preferences: JobPreferences }
    | { ok: false; stepId: StepId; message: string };

/**
 * The checks every save runs, in order: the onboarding steps
 * (`validateForCompletion`, the same rules the browser used), then the job
 * titles against the catalogue. Returns the draft to store — with the
 * catalogue's spelling of each title — or the step to send the user back to.
 */
async function checkDraft(
    raw: unknown,
    titles: TitleCatalogue,
): Promise<{ ok: true; draft: JobPreferences } | Extract<SaveResult, { ok: false }>> {
    const draft = parsePreferences(raw);
    const missing = validateForCompletion(draft);
    if (missing) return { ok: false, ...missing };

    // Catalogue titles only. The form only offers catalogue titles, but the
    // request can be edited, so this is where the rule actually holds.
    const resolved = await titles.resolve(draft.jobTitles);
    if (!resolved.ok) return { ok: false, stepId: "titles", message: unknownTitlesMessage(resolved.unknown) };

    return { ok: true, draft: { ...draft, jobTitles: resolved.titles } };
}

/**
 * Finishing onboarding: save the answers and set the flag.
 *
 * A request that skips a required step, or names a title Jobak doesn't know,
 * is refused with the step to go back to rather than saved. The flag is only
 * ever set here.
 */
export class CompleteOnboardingUseCase {
    constructor(
        private readonly preferences: PreferencesRepository,
        private readonly titles: TitleCatalogue,
    ) {}

    async execute(userId: string, raw: unknown): Promise<SaveResult> {
        const checked = await checkDraft(raw, this.titles);
        if (!checked.ok) return checked;

        await this.preferences.save(userId, checked.draft, { completeOnboarding: true });
        return { ok: true, preferences: checked.draft };
    }
}

/**
 * Editing preferences later, from the dashboard.
 *
 * Same checks — the job search needs the same answers either way — but never
 * touches the onboarding flag.
 */
export class UpdatePreferencesUseCase {
    constructor(
        private readonly preferences: PreferencesRepository,
        private readonly titles: TitleCatalogue,
    ) {}

    async execute(userId: string, raw: unknown): Promise<SaveResult> {
        const checked = await checkDraft(raw, this.titles);
        if (!checked.ok) return checked;

        await this.preferences.save(userId, checked.draft, { completeOnboarding: false });
        return { ok: true, preferences: checked.draft };
    }
}

/**
 * Whether the user has finished onboarding — what sends a new user to
 * /onboarding and a finished one away from it. Read errors propagate: see
 * `hasCompletedOnboarding` in the module's interface for what callers do.
 */
export class GetOnboardingStatusUseCase {
    constructor(private readonly preferences: PreferencesRepository) {}

    execute(userId: string): Promise<boolean> {
        return this.preferences.hasCompletedOnboarding(userId);
    }
}

/** The user's saved preferences, or null when they have none yet. */
export class GetPreferencesUseCase {
    constructor(private readonly preferences: PreferencesRepository) {}

    execute(userId: string): Promise<StoredPreferences | null> {
        return this.preferences.findByUserId(userId);
    }
}
