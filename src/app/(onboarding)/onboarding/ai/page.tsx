import { redirect } from "next/navigation";

import { requireUser } from "@/backend/modules/auth/interface";
import { getPreferencesModule, type JobPreferences } from "@/backend/modules/preferences";
import { LoadFailed } from "@/frontend/components/dashboard/load-failed";
import { AiSetupFlow } from "@/frontend/components/onboarding/ai/ai-setup-flow";
import { ONBOARDING_HREF } from "@/frontend/lib/configs/cta";
import { countryName } from "@/frontend/lib/configs/countries";

import { readOnboardingStatus } from "../../_lib/onboarding-status";

/** "3 roles in Egypt and the UAE", "1 role, remote from anywhere" — the user's own search, in one line. */
function describeSearch(p: JobPreferences | null): string {
    if (!p) return "your roles and locations";
    const roles = `${p.jobTitles.length} ${p.jobTitles.length === 1 ? "role" : "roles"}`;
    if (p.location.worldwide) return `${roles}, remote from anywhere`;

    const names = p.location.countries.map(countryName);
    const where =
        names.length <= 2 ? names.join(" and ") : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
    return where ? `${roles} in ${where}` : roles;
}

/**
 * /onboarding/ai — the second onboarding: connecting the AI.
 *
 * Comes after the job questions, so anyone who hasn't answered them is sent
 * back there first. (Once connecting is real, a connected user will be sent
 * on to the dashboard from here — part of the backend still to build.)
 */
export default async function AiSetupPage() {
    const user = await requireUser();

    const answered = await readOnboardingStatus(user.id);
    if (answered === null) return <LoadFailed />;
    if (!answered) redirect(ONBOARDING_HREF);

    // Only for the summary line; a failed read just makes it generic.
    const saved = await getPreferencesModule()
        .get.execute(user.id)
        .catch(() => null);

    return <AiSetupFlow summary={describeSearch(saved)} firstName={user.fullName?.split(/\s+/)[0] ?? null} />;
}
