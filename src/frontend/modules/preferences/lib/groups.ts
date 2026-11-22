import { createSteps, WORK_MODE_LABEL } from "@/frontend/modules/onboarding";
import { countryName } from "@/shared/countries";
import type { JobPreferences } from "@/shared/contracts/preferences";
import type { StepId } from "@/shared/onboarding/step-rules";

/**
 * The Preferences page's groups — the onboarding steps that are answers — and
 * what's said about each. Pure: no state, no React.
 */

/** The groups, in order: the onboarding steps for "settings" (the factory leaves out review). */
export const GROUPS: StepId[] = createSteps("settings").map((step) => step.id);

export const GROUP_LABEL: Record<StepId, string> = {
    location: "Location",
    workMode: "Work mode",
    titles: "Roles",
    details: "Details",
    review: "Review",
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The one-line answer under each tab, so the whole search reads at a glance. */
export function summaryOf(stepId: StepId, d: JobPreferences): string {
    switch (stepId) {
        case "location":
            if (d.location.worldwide) return "Anywhere";
            if (d.location.countries.length === 1) return countryName(d.location.countries[0]!);
            return d.location.countries.length ? plural(d.location.countries.length, "country", "countries") : "Not set";
        case "workMode":
            if (d.location.worldwide) return "Remote only";
            return d.workModes.length ? d.workModes.map((m) => WORK_MODE_LABEL[m]).join(", ") : "Not set";
        case "titles":
            return d.jobTitles.length ? plural(d.jobTitles.length, "title", "titles") : "Not set";
        case "details": {
            const n = d.jobTypes.length + (d.seniority ? 1 : 0);
            return n ? plural(n, "filter", "filters") : "Any";
        }
        default:
            return "";
    }
}

/** What each group's answer is made of, to tell which groups have unsaved edits. */
export function groupKey(stepId: StepId, d: JobPreferences): string {
    const sorted = (list: readonly string[]) => [...list].sort().join("|");
    switch (stepId) {
        case "location":
            return `${d.location.worldwide}:${sorted(d.location.countries)}`;
        case "workMode":
            return sorted(d.workModes);
        case "titles":
            return `${sorted(d.jobTitles)}/${sorted(d.keywords)}/${d.field ?? ""}`;
        case "details":
            return `${sorted(d.jobTypes)}/${d.seniority ?? ""}`;
        default:
            return "";
    }
}

/** The groups whose answer differs between two versions — the unsaved ones. */
export function changedGroups(draft: JobPreferences, saved: JobPreferences): StepId[] {
    return GROUPS.filter((id) => groupKey(id, draft) !== groupKey(id, saved));
}
