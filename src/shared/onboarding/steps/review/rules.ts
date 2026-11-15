import type { StepRules } from "../../step-rules";

/** The answers, read back before saving. The last step. */
export const reviewRules: StepRules = {
  id: "review",
  title: "Check your answers",
  description: "This is what Jobak will search for. You can change it any time from Preferences.",
  appliesTo: () => true,
  // Every earlier step is checked before completing (see `validateForCompletion`).
  validate: () => null,
};
