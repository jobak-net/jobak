import { requireDashboardUser } from "@/frontend/modules/dashboard/server";
import { SettingsView } from "@/frontend/modules/settings";

export default async function SettingsPage() {
  const user = await requireDashboardUser();
  return <SettingsView email={user.email} fullName={user.fullName} />;
}
