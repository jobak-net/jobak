import type { StepRules } from "../step-rules";

/** The roles to search for, plus optional keywords. */
export const titlesRules: StepRules = {
  id: "titles",
  title: "What roles are you looking for?",
  description: "Job titles to search for, plus keywords like skills or tools to match in postings.",
  appliesTo: () => true,
  // Keywords sharpen the match but are optional; a search needs at least one title.
  validate: (d) => (d.jobTitles.length > 0 ? null : "Add at least one job title."),
};
