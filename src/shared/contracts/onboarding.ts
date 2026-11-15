/**
 * The contract of `POST /api/v1/onboarding`: finishing onboarding with the
 * user's answers. Imports only other shared files (see `../referral-cookie`
 * for the rule of this folder).
 *
 *   request   JobPreferences as JSON (`Content-Type: application/json`)
 *   200       SaveOnboardingResponse — saved, or refused with the step to fix
 *   400       { error }   the body isn't JSON
 *   401       { error }   nobody is signed in
 *   415       { error }   not sent as JSON
 *   503       { error }   couldn't save
 *
 * A refusal is a normal answer (200, `ok: false`), not an error: the server
 * re-ran the step rules (`validateForCompletion`) and the catalogue check, and
 * names the step the form should go back to.
 */

import type { StepId } from "@/shared/onboarding/step-rules";

import type { JobPreferences } from "./preferences";

export const ONBOARDING_API_PATH = "/api/v1/onboarding";

export type SaveOnboardingRequest = JobPreferences;

export type SaveOnboardingResponse =
  /** Saved. `preferences` is what was stored (catalogue spelling of each title). */
  | { ok: true; preferences: JobPreferences }
  /** Refused: go back to `stepId` and show `message`. */
  | { ok: false; stepId: StepId; message: string };
