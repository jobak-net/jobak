/**
 * The Settings tabs, in order. A plain module (not "use client") so the page,
 * a server component, can check `?tab=` against it.
 */
export const SETTINGS_TABS = ["ai", "job-collection", "notifications", "account"] as const;
export type SettingsTabId = (typeof SETTINGS_TABS)[number];

/** `?tab=` as a real tab, or undefined for anything else. */
export function settingsTabFrom(value: string | string[] | undefined): SettingsTabId | undefined {
    return typeof value === "string" && (SETTINGS_TABS as readonly string[]).includes(value) ? (value as SettingsTabId) : undefined;
}
