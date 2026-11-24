import { PageHeader } from "@/frontend/shared/ui";
import type { JobField } from "@/shared/contracts/job-catalogue";
import type { JobPreferences } from "@/shared/contracts/preferences";

import { PreferencesForm } from "../components/preferences-form";

/** /dashboard/preferences — the onboarding answers, editable on one page. */
export function PreferencesView({ initial, catalogue }: { initial: JobPreferences | null; catalogue: JobField[] }) {
    return (
        <>
            <PageHeader
                title="Job preferences"
                description="What Jobak searches for on your behalf. The same answers you gave when you signed up — change them any time and your next search uses them."
            />
            <PreferencesForm initial={initial} catalogue={catalogue} />
        </>
    );
}
