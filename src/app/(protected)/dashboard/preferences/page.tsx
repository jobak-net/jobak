import { PreferencesView } from "@/frontend/modules/preferences";
import { loadPreferencesForm } from "@/frontend/modules/preferences/server";

/** /dashboard/preferences — the onboarding answers, editable on one page. */
export default async function PreferencesPage() {
  return <PreferencesView {...await loadPreferencesForm()} />;
}
