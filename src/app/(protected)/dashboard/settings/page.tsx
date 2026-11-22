import { requireDashboardUser } from "@/frontend/modules/dashboard/server";
import { SettingsView } from "@/frontend/modules/settings";
import { loadAiSettings } from "@/frontend/modules/settings/server";

export default async function SettingsPage() {
  const [user, aiSettings] = await Promise.all([requireDashboardUser(), loadAiSettings()]);
  return <SettingsView email={user.email} fullName={user.fullName} aiSettings={aiSettings} />;
}
