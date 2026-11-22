import type { StepRules } from "../../step-rules";

/** Contract type and seniority. Both optional. */
export const detailsRules: StepRules = {
  id: "details",
  title: "Any other preferences?",
  description: "Contract type and seniority. Optional: leave them empty to see everything.",
  appliesTo: () => true,
  // Both optional: an empty answer means "no filter", which is a valid choice.
  validate: () => null,
};
