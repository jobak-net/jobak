import type { JobPreferences } from "@/backend/modules/preferences/domain/job-preferences";

import type { SearchStatsRepository } from "../domain/search-stats.repository";
import { criteriaFrom, type SetupStepId, type SetupStepResult } from "../domain/setup-steps";

/** What the steps need from preferences: the user's saved answers. A port, so this module doesn't import that one's internals. */
export interface PreferencesReader {
    get(userId: string): Promise<JobPreferences | null>;
}

/** One setup step: given the user's saved answers, do its work and report. */
type SetupStrategy = (preferences: JobPreferences) => Promise<SetupStepResult>;

/**
 * Runs one step of the setup by id.
 *
 * Strategy pattern: each step is a function with the same signature, picked
 * from a map, so adding a step is adding an entry — the screen just asks for
 * the next id. Every step starts from the same thing, the saved preferences,
 * which are read fresh each time rather than trusted from the browser.
 *
 * A step that fails reports it (`ok: false`) rather than throwing: the setup
 * is a moment of orientation, and a slow count must never stand between a
 * user and connecting their AI.
 */
export class RunSetupStepUseCase {
    private readonly strategies: Record<SetupStepId, SetupStrategy>;

    constructor(
        private readonly preferences: PreferencesReader,
        stats: SearchStatsRepository,
    ) {
        this.strategies = {
            preferences: async (p) => ({
                ok: true,
                step: "preferences",
                data: {
                    titles: p.jobTitles.length,
                    countries: p.location.countries,
                    worldwide: p.location.worldwide,
                    workModes: p.workModes,
                },
            }),
            search: async (p) => ({ ok: true, step: "search", data: await stats.funnel(criteriaFrom(p)) }),
            sources: async (p) => ({ ok: true, step: "sources", data: await stats.sources(criteriaFrom(p)) }),
        };
    }

    async execute(userId: string, step: SetupStepId): Promise<SetupStepResult> {
        try {
            const preferences = await this.preferences.get(userId);
            if (!preferences) return { ok: false, step, message: "Your job preferences aren't saved yet." };
            return await this.strategies[step](preferences);
        } catch (error) {
            console.error(`[setup] step "${step}" failed`, error);
            return { ok: false, step, message: "Couldn't check this right now." };
        }
    }
}
