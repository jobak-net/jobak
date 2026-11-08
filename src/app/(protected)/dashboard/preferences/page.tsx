import { requireUser } from "@/backend/modules/auth/interface";
import { getJobCatalogueModule } from "@/backend/modules/job-catalogue";
import { getPreferencesModule } from "@/backend/modules/preferences";
import { PreferencesForm } from "@/frontend/components/dashboard/preferences-form";
import { PageHeader } from "@/frontend/components/ui";

/**
 * /dashboard/preferences — the onboarding answers, editable on one page.
 *
 * Loads the saved preferences and the job fields (for the titles section's
 * suggestions). A failure to read preferences goes to the dashboard's error
 * boundary rather than opening an empty form, which a save would then use to
 * overwrite what is really there.
 */
export default async function PreferencesPage() {
    const user = await requireUser();

    const [saved, catalogue] = await Promise.all([
        getPreferencesModule().get.execute(user.id),
        getJobCatalogueModule()
            .listFields.execute()
            // Suggestions are a convenience; search works without them.
            .catch((error) => {
                console.error("[preferences] could not load job fields", error);
                return [];
            }),
    ]);

    return (
        <>
            <PageHeader
                title="Job preferences"
                description="What Jobak searches for on your behalf. The same answers you gave when you signed up — change them any time and your next search uses them."
            />
            <PreferencesForm initial={saved} catalogue={catalogue} />
        </>
    );
}
