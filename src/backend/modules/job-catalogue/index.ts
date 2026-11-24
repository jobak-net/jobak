/**
 * Server entry point for the job catalogue module.
 *
 * The browser imports the pure part — `domain/job-catalogue` — directly, never
 * this file, which pulls in the database.
 */
export { getJobCatalogueModule, type JobCatalogueModule } from "./composition";
export type { ResolveResult } from "./application/job-catalogue.use-cases";
export type { JobField, JobTitleMatch } from "./domain/job-catalogue";
export type { JobCatalogueRepository } from "./domain/job-catalogue.repository";
