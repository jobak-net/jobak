import type { FeedbackCategory } from "@/shared/contracts/feedback";

/**
 * The feedback form's options: each category with what the form says about it.
 *
 * Only the words live here. The list of values, the message bounds and the
 * check are the shared contract (`@/shared/contracts/feedback`), which the API
 * validates against too.
 */
export const FEEDBACK_CATEGORIES = [
    { value: "bug", label: "Something is broken", hint: "A page, a button, a search that fails" },
    { value: "listing", label: "A listing is wrong", hint: "Wrong location, filled, duplicate, spam" },
    { value: "feature", label: "I want something", hint: "A source, a filter, a language" },
    { value: "praise", label: "It worked", hint: "Tell us what helped — it decides what we build" },
    { value: "other", label: "Something else", hint: "" },
] as const satisfies readonly { value: FeedbackCategory; label: string; hint: string }[];
