import { requireUser } from "@/backend/modules/auth/interface";
import { SettingsPanels } from "@/frontend/components/dashboard/settings-panels";
import { PageHeader } from "@/frontend/components/ui";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader
        preview="Preview. Changes here are not saved yet."
        title="Settings"
        description="Your AI, your emails and your account."
      />
      <SettingsPanels email={user.email} fullName={user.fullName} />
    </>
  );
}
