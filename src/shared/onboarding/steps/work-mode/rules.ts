import type { StepRules } from "../../step-rules";

/** Remote, hybrid, on-site. */
export const workModeRules: StepRules = {
  id: "workMode",
  title: "How do you want to work?",
  description: "Pick every arrangement you'd accept.",
  // Anywhere in the world means remote only (Jobak targets MENA), so there is
  // exactly one possible answer and nothing to ask.
  appliesTo: (d) => !d.location.worldwide,
  validate: (d) => (d.workModes.length > 0 ? null : "Choose at least one: remote, hybrid or on-site."),
};
