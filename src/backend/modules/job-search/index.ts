/**
 * Server entry point for the job search module.
 *
 * The browser imports the pure part — `domain/setup-steps` — directly, never
 * this file, which pulls in the database.
 */
export { getJobSearchModule, type JobSearchModule } from "./composition";
export type { SetupStepId, SetupStepResult } from "./domain/setup-steps";
