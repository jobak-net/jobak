import { requireDashboardUser } from "@/frontend/modules/dashboard/server";
import { SettingsView, settingsTabFrom } from "@/frontend/modules/settings";
import { loadAiSettings } from "@/frontend/modules/settings/server";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const [user, aiSettings, query] = await Promise.all([requireDashboardUser(), loadAiSettings(), searchParams]);
  return (
    <SettingsView
      accountId={user.id}
      email={user.email}
      fullName={user.fullName}
      aiSettings={aiSettings}
      initialTab={settingsTabFrom(query.tab)}
    />
  );
}
