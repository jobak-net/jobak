import { PageHeader } from "@/frontend/shared/ui";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";

import { SettingsPanels } from "../components/settings-panels";
import type { SettingsTabId } from "../lib/tabs";

/** /dashboard/settings — the AI and job-collection tabs are saved; notifications are still a preview. */
export function SettingsView({
  accountId,
  email,
  fullName,
  aiSettings,
  initialTab,
}: {
  accountId: string;
  email: string | null;
  fullName: string | null;
  /** `loadAiSettings()`; null when it couldn't be read. */
  aiSettings: AiSettingsResponse | null;
  /** The tab `?tab=` asked for, already checked against the real tabs. */
  initialTab?: SettingsTabId;
}) {
  return (
    <>
      <PageHeader
        preview="Preview. Notifications aren't saved yet."
        title="Settings"
        description="Your AI, job collection, emails and account."
      />
      <SettingsPanels accountId={accountId} email={email} fullName={fullName} aiSettings={aiSettings} initialTab={initialTab} />
    </>
  );
}
