import "server-only";

import {
    ListFieldsUseCase,
    ResolveTitlesUseCase,
    SearchTitlesUseCase,
} from "./application/job-catalogue.use-cases";
import { PgJobCatalogueRepository } from "./infrastructure/pg-job-catalogue.repository";

/**
 * The job catalogue module's composition root. Cached per process like the
 * other modules — which also keeps `ListFieldsUseCase`'s cache alive across
 * requests and dev-server reloads.
 */
export interface JobCatalogueModule {
    listFields: ListFieldsUseCase;
    search: SearchTitlesUseCase;
    resolve: ResolveTitlesUseCase;
}

const globalForCatalogue = globalThis as unknown as { jobCatalogueModule?: JobCatalogueModule };

export function getJobCatalogueModule(): JobCatalogueModule {
    if (!globalForCatalogue.jobCatalogueModule) {
        const repository = new PgJobCatalogueRepository();
        globalForCatalogue.jobCatalogueModule = {
            listFields: new ListFieldsUseCase(repository),
            search: new SearchTitlesUseCase(repository),
            resolve: new ResolveTitlesUseCase(repository),
        };
    }
    return globalForCatalogue.jobCatalogueModule;
}
