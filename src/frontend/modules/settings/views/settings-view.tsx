import { PageHeader } from "@/frontend/shared/ui";

import { SettingsPanels } from "../components/settings-panels";

/** /dashboard/settings — a preview: nothing here is saved yet. */
export function SettingsView({ email, fullName }: { email: string | null; fullName: string | null }) {
  return (
    <>
      <PageHeader
        preview="Preview. Changes here are not saved yet."
        title="Settings"
        description="Your AI, your emails and your account."
      />
      <SettingsPanels email={email} fullName={fullName} />
    </>
  );
}
