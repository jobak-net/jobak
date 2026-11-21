"use client";

import { StepTabs } from "@/frontend/components/dashboard/step-tabs";
import { SearchPreview } from "@/frontend/components/onboarding/search-preview";
import type { JobField } from "@/shared/contracts/job-catalogue";
import type { JobPreferences } from "@/shared/contracts/preferences";

import { GroupPanel } from "./group-panel";
import { GROUP_LABEL, GROUPS, summaryOf } from "./groups";
import { SaveBar } from "./save-bar";
import { usePreferencesForm } from "./use-preferences-form";

/**
 * The dashboard's Preferences page: the onboarding answers, one group at a time.
 *
 * Onboarding without the wizard's order. Tabs across the top open each group;
 * each group is the very screen the onboarding step draws, edits go through
 * the same rules, the same steps decide what is complete and the save runs the
 * same server checks — so the two pages can never disagree about what a valid
 * search is. Beside the form, the same live preview onboarding shows.
 *
 *     use-preferences-form.ts   state and saving
 *     groups.ts                 the groups, their labels and summaries
 *     group-panel.tsx           the open group
 *     worldwide-notice.tsx      Work mode, when "anywhere" fixes it to remote
 *     save-bar.tsx              the floating Discard / Save bar
 */
export function PreferencesForm({ initial, catalogue }: { initial: JobPreferences | null; catalogue: JobField[] }) {
    const form = usePreferencesForm(initial);

    return (
        <div className="pb-28">
            <StepTabs
                label="Preference groups"
                idPrefix="preferences"
                panelId="preferences-panel"
                active={form.active}
                onSelect={form.open}
                tabs={GROUPS.map((id) => ({
                    id,
                    label: GROUP_LABEL[id],
                    summary: summaryOf(id, form.draft),
                    error: form.error?.stepId === id,
                    changed: form.changed.includes(id),
                }))}
            />

            {/* ── The selected group, beside the live preview ─────── */}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <GroupPanel
                    active={form.active}
                    index={form.index}
                    direction={form.direction}
                    onRoute={form.onRoute}
                    draft={form.draft}
                    update={form.update}
                    catalogue={catalogue}
                    error={form.error}
                    previous={form.previous}
                    next={form.next}
                    open={form.open}
                />

                {/* The same live preview onboarding shows. Wide screens only: on a phone it would push the form down. */}
                <aside className="hidden xl:block">
                    <div className="sticky top-6 h-[min(720px,calc(100dvh-3rem))]">
                        <SearchPreview draft={form.draft} stepId={form.active} />
                    </div>
                </aside>
            </div>

            <SaveBar
                changed={form.changed}
                dirty={form.dirty}
                justSaved={form.justSaved}
                saving={form.saving}
                error={form.error}
                onDiscard={form.discard}
                onSave={form.save}
            />
        </div>
    );
}
