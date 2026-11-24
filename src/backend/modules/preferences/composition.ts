import "server-only";

import {
    CompleteOnboardingUseCase,
    GetOnboardingStatusUseCase,
    GetPreferencesUseCase,
    UpdatePreferencesUseCase,
} from "./application/save-preferences.use-cases";
import { getJobCatalogueModule } from "@/backend/modules/job-catalogue";

import type { TitleCatalogue } from "./domain/title-catalogue";
import { PgPreferencesRepository } from "./infrastructure/pg-preferences.repository";

/**
 * The preferences module's composition root: the one place that picks the
 * implementations. Cached per process, as in the other modules — the objects
 * are stateless and Next's dev server re-evaluates modules on every reload.
 */
export interface PreferencesModule {
    get: GetPreferencesUseCase;
    onboardingStatus: GetOnboardingStatusUseCase;
    completeOnboarding: CompleteOnboardingUseCase;
    update: UpdatePreferencesUseCase;
}

/*
 * Bump when the module's shape changes. The cache outlives hot reloads, so a
 * dev server running since before a new use case was added would otherwise
 * keep serving the old object — and `module.newThing` would be undefined.
 */
const VERSION = 2;

const globalForPreferences = globalThis as unknown as {
    preferencesModule?: PreferencesModule;
    preferencesModuleVersion?: number;
};

export function getPreferencesModule(): PreferencesModule {
    if (!globalForPreferences.preferencesModule || globalForPreferences.preferencesModuleVersion !== VERSION) {
        globalForPreferences.preferencesModuleVersion = VERSION;
        const repository = new PgPreferencesRepository();
        // The catalogue module answers the TitleCatalogue port.
        const catalogue = getJobCatalogueModule();
        const titles: TitleCatalogue = { resolve: (list) => catalogue.resolve.execute(list) };

        globalForPreferences.preferencesModule = {
            get: new GetPreferencesUseCase(repository),
            onboardingStatus: new GetOnboardingStatusUseCase(repository),
            completeOnboarding: new CompleteOnboardingUseCase(repository, titles),
            update: new UpdatePreferencesUseCase(repository, titles),
        };
    }
    return globalForPreferences.preferencesModule;
}
