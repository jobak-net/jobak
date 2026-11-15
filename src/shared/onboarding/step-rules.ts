import type { JobPreferences } from "@/shared/contracts/preferences";

/**
 * The rules of one onboarding step — the shared half of a step *strategy*.
 *
 * Every step answers the same two questions about the draft, and only about
 * itself:
 *
 *  - `appliesTo`: should this step be asked at all? ("Anywhere in the world"
 *    fixes the work mode to remote, so the work-mode step says it doesn't
 *    apply.)
 *  - `validate`: is it complete? A message the user can act on, or null.
 *
 * No step knows which step comes before or after it. The order is a plain
 * list (`STEP_ORDER` in `./steps/index.ts`), and the steps actually shown are that
 * list minus the ones that don't apply.
 *
 * Stateless and shared: the browser (driving the screens) and the backend
 * (re-checking on save) run the same rules and can't disagree. The frontend
 * pairs each with its screen in a matching folder
 * (`frontend/components/onboarding/questions/steps/<step>/`).
 */

export type StepId = "location" | "workMode" | "titles" | "details" | "review";

export interface StepRules {
  readonly id: StepId;
  /** Short heading for the step indicator. */
  readonly title: string;
  /** One line under the heading, saying why the step is asked. */
  readonly description: string;

  /** Whether this step is asked, given the answers so far. */
  appliesTo(draft: JobPreferences): boolean;

  /**
   * What is missing, in words a user can act on — or null when this step is
   * satisfied. Shape is already guaranteed by `applySearchRules`; this is about
   * completeness ("pick at least one country").
   */
  validate(draft: JobPreferences): string | null;
}
