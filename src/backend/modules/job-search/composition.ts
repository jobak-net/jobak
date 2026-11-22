import "server-only";

import { getPreferencesModule } from "@/backend/modules/preferences";

import { ListUserJobsUseCase } from "./application/list-user-jobs.use-case";
import { RunSetupStepUseCase } from "./application/run-setup-step.use-case";
import { SetBookmarkUseCase } from "./application/set-bookmark.use-case";
import type { PreferencesReader } from "./domain/preferences-reader";
import { PgBookmarkRepository } from "./infrastructure/pg-bookmark.repository";
import { PgJobPoolRepository } from "./infrastructure/pg-job-pool.repository";
import { PgSearchStatsRepository } from "./infrastructure/pg-search-stats.repository";

/**
 * The job search module's composition root. Cached per process, versioned so
 * a running dev server rebuilds it when its shape changes (see preferences).
 */
export interface JobSearchModule {
    runSetupStep: RunSetupStepUseCase;
    /** The jobs worth showing a user — `GET /api/v1/jobs`. */
    listUserJobs: ListUserJobsUseCase;
    /** Bookmarks a job or removes the bookmark — `PUT /api/v1/jobs/[jobId]/bookmark`. */
    setBookmark: SetBookmarkUseCase;
}

const VERSION = 4;

const globalForJobSearch = globalThis as unknown as {
    jobSearchModule?: JobSearchModule;
    jobSearchModuleVersion?: number;
};

export function getJobSearchModule(): JobSearchModule {
    if (!globalForJobSearch.jobSearchModule || globalForJobSearch.jobSearchModuleVersion !== VERSION) {
        // The preferences module answers the PreferencesReader port.
        const preferences: PreferencesReader = { get: (userId) => getPreferencesModule().get.execute(userId) };
        globalForJobSearch.jobSearchModule = {
            runSetupStep: new RunSetupStepUseCase(preferences, new PgSearchStatsRepository()),
            listUserJobs: new ListUserJobsUseCase(preferences, new PgJobPoolRepository()),
            setBookmark: new SetBookmarkUseCase(new PgBookmarkRepository()),
        };
        globalForJobSearch.jobSearchModuleVersion = VERSION;
    }
    return globalForJobSearch.jobSearchModule;
}
