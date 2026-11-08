import type { OnboardingStep, StepId } from "./onboarding-step";

/**
 * The concrete onboarding steps, in the order a user meets them.
 *
 * Only the questions that narrow a job search are asked here — everything else
 * waits for the dashboard. The route between steps:
 *
 *     location ──worldwide──────────────┐
 *        │                              ▼
 *        └──a country──▶ workMode ──▶ titles ──▶ details ──▶ review
 *
 * Anywhere in the world means remote only (Jobak targets MENA), so the
 * work-mode question has exactly one possible answer there and is skipped.
 */

const LocationStep: OnboardingStep = {
    id: "location",
    title: "Where do you want to work?",
    description: "Pick the MENA countries you'd work in, or anywhere in the world for remote roles.",
    validate: (d) =>
        d.location.worldwide || d.location.countries.length > 0
            ? null
            : "Choose at least one country, or anywhere in the world.",
    // The branch: worldwide fixes the work mode to remote, so there is nothing to ask.
    next: (d) => (d.location.worldwide ? "titles" : "workMode"),
};

const WorkModeStep: OnboardingStep = {
    id: "workMode",
    title: "How do you want to work?",
    description: "Pick every arrangement you'd accept.",
    validate: (d) => (d.workModes.length > 0 ? null : "Choose at least one: remote, hybrid or on-site."),
    next: () => "titles",
};

const TitlesStep: OnboardingStep = {
    id: "titles",
    title: "What roles are you looking for?",
    description: "Job titles to search for, plus keywords like skills or tools to match in postings.",
    // Keywords sharpen the match but are optional; a search needs at least one title.
    validate: (d) => (d.jobTitles.length > 0 ? null : "Add at least one job title."),
    next: () => "details",
};

const DetailsStep: OnboardingStep = {
    id: "details",
    title: "Any other preferences?",
    description: "Contract type and seniority. Optional: leave them empty to see everything.",
    // Both optional: an empty answer means "no filter", which is a valid choice.
    validate: () => null,
    next: () => "review",
};

const ReviewStep: OnboardingStep = {
    id: "review",
    title: "Check your answers",
    description: "This is what Jobak will search for. You can change it any time from Preferences.",
    // The flow checks every earlier step before completing (see `validateForCompletion`).
    validate: () => null,
    next: () => null,
};

/** Every step by id. The flow looks steps up here; nothing else should. */
export const STEPS: Readonly<Record<StepId, OnboardingStep>> = {
    location: LocationStep,
    workMode: WorkModeStep,
    titles: TitlesStep,
    details: DetailsStep,
    review: ReviewStep,
};

export const FIRST_STEP: StepId = "location";
