import { PageHeader } from "@/frontend/shared/ui";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";

import { SettingsPanels } from "../components/settings-panels";

/** /dashboard/settings — the AI tab is saved; notifications are still a preview. */
export function SettingsView({
  email,
  fullName,
  aiSettings,
}: {
  email: string | null;
  fullName: string | null;
  /** `loadAiSettings()`; null when it couldn't be read. */
  aiSettings: AiSettingsResponse | null;
}) {
  return (
    <>
      <PageHeader
        preview="Preview. Notifications aren't saved yet."
        title="Settings"
        description="Your AI, your emails and your account."
      />
      <SettingsPanels email={email} fullName={fullName} aiSettings={aiSettings} />
    </>
  );
}
