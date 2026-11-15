import type { StepRules } from "../../step-rules";

/** Where the user wants to work. */
export const locationRules: StepRules = {
  id: "location",
  title: "Where do you want to work?",
  description: "Pick the MENA countries you'd work in, or anywhere in the world for remote roles.",
  appliesTo: () => true,
  validate: (d) =>
    d.location.worldwide || d.location.countries.length > 0
      ? null
      : "Choose at least one country, or anywhere in the world.",
};
