"use client";

import { useCallback, useEffect, useReducer, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Globe2, Loader2, RotateCcw } from "lucide-react";

import { updatePreferencesAction } from "@/backend/actions/preferences";
import {
    EMPTY_PREFERENCES,
    applySearchRules,
    type JobPreferences,
} from "@/backend/modules/preferences/domain/job-preferences";
import {
    STEPS,
    applyDraftPatch,
    routeFor,
    validateForCompletion,
    type DraftPatch,
    type StepId,
} from "@/backend/modules/preferences/domain/onboarding";
import { WORK_MODE_LABEL } from "@/frontend/components/onboarding/labels";
import { SearchPreview } from "@/frontend/components/onboarding/search-preview";
import { STEP_SCREENS } from "@/frontend/components/onboarding/step-screens";
import { StepTabs, stepTabId, useSlideDirection } from "@/frontend/components/dashboard/step-tabs";
import { Button } from "@/frontend/components/ui";
import { countryName } from "@/frontend/lib/configs/countries";
import type { JobField } from "@/frontend/lib/configs/job-titles";
import { cn } from "@/frontend/lib/utils/utils";

/** The onboarding steps that are answers; the review step has no place on a settings page. */
const GROUPS: StepId[] = ["location", "workMode", "titles", "details"];

const GROUP_LABEL: Record<StepId, string> = {
    location: "Location",
    workMode: "Work mode",
    titles: "Roles",
    details: "Details",
    review: "Review",
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The one-line answer under each tab, so the whole search reads at a glance. */
function summaryOf(stepId: StepId, d: JobPreferences): string {
    switch (stepId) {
        case "location":
            if (d.location.worldwide) return "Anywhere";
            if (d.location.countries.length === 1) return countryName(d.location.countries[0]!);
            return d.location.countries.length ? plural(d.location.countries.length, "country", "countries") : "Not set";
        case "workMode":
            if (d.location.worldwide) return "Remote only";
            return d.workModes.length ? d.workModes.map((m) => WORK_MODE_LABEL[m]).join(", ") : "Not set";
        case "titles":
            return d.jobTitles.length ? plural(d.jobTitles.length, "title", "titles") : "Not set";
        case "details": {
            const n = d.jobTypes.length + (d.seniority ? 1 : 0);
            return n ? plural(n, "filter", "filters") : "Any";
        }
        default:
            return "";
    }
}

/** What each group's answer is made of, to tell which groups have unsaved edits. */
function groupKey(stepId: StepId, d: JobPreferences): string {
    const sorted = (list: readonly string[]) => [...list].sort().join("|");
    switch (stepId) {
        case "location":
            return `${d.location.worldwide}:${sorted(d.location.countries)}`;
        case "workMode":
            return sorted(d.workModes);
        case "titles":
            return `${sorted(d.jobTitles)}/${sorted(d.keywords)}/${d.field ?? ""}`;
        case "details":
            return `${sorted(d.jobTypes)}/${d.seniority ?? ""}`;
        default:
            return "";
    }
}

/**
 * The dashboard's Preferences page: the onboarding answers, one group at a time.
 *
 * Onboarding without the wizard's order. Tabs across the top open each group;
 * each group is the very screen the onboarding step draws (`STEP_SCREENS`),
 * edits go through the same rules (`applyDraftPatch`), the same steps decide
 * what is complete and the save runs the same server checks — so the two
 * pages can never disagree about what a valid search is. Beside the form,
 * the same live preview onboarding shows.
 *
 * The State flow still decides what applies: with "anywhere in the world"
 * the work-mode step is off the route (remote only), so its group explains
 * that instead of offering choices that would be ignored.
 */
export function PreferencesForm({ initial, catalogue }: { initial: JobPreferences | null; catalogue: JobField[] }) {
    const [saved, setSaved] = useState(() => applySearchRules(initial ?? EMPTY_PREFERENCES));
    const [draft, dispatch] = useReducer(applyDraftPatch, saved);
    const [active, setActive] = useState<StepId>("location");
    /** A group's problem (`stepId`), or one with the save itself (`null`), shown in the save bar. */
    const [error, setError] = useState<{ stepId: StepId | null; message: string } | null>(null);
    const [justSaved, setJustSaved] = useState(false);
    const [saving, startSaving] = useTransition();

    const changed = GROUPS.filter((id) => groupKey(id, draft) !== groupKey(id, saved));
    const dirty = changed.length > 0;
    const onRoute = routeFor(draft).includes(active);
    const index = GROUPS.indexOf(active);

    // Which way the group changed, so it slides in from that side (as onboarding does).
    const direction = useSlideDirection(active, index);

    // Stable, so the memoised options in the screens skip re-rendering.
    const update = useCallback((patch: DraftPatch) => {
        setError(null);
        setJustSaved(false);
        dispatch(patch);
    }, []);
    const noGoTo = useCallback(() => {}, []);

    // Leaving with unsaved edits asks first.
    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => event.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const open = setActive;

    function save() {
        // The same check the server runs, so most mistakes are caught without a round trip.
        const missing = validateForCompletion(draft);
        if (missing) {
            setActive(missing.stepId);
            return setError(missing);
        }

        startSaving(async () => {
            try {
                const result = await updatePreferencesAction(draft);
                if (!result.ok) {
                    setActive(result.stepId);
                    return setError({ stepId: result.stepId, message: result.message });
                }
                // What was stored, with the catalogue's spelling of each title.
                setSaved(result.preferences);
                dispatch(result.preferences);
                setJustSaved(true);
            } catch {
                setError({ stepId: null, message: "Couldn't save. Check your connection and try again." });
            }
        });
    }

    function discard() {
        dispatch(saved);
        setError(null);
    }

    const step = STEPS[active];
    const Screen = STEP_SCREENS[active];
    const previous = GROUPS[index - 1];
    const next = GROUPS[index + 1];

    return (
        <div className="pb-28">
            <StepTabs
                label="Preference groups"
                idPrefix="preferences"
                panelId="preferences-panel"
                active={active}
                onSelect={setActive}
                tabs={GROUPS.map((id) => ({
                    id,
                    label: GROUP_LABEL[id],
                    summary: summaryOf(id, draft),
                    error: error?.stepId === id,
                    changed: changed.includes(id),
                }))}
            />

            {/* ── The selected group, beside the live preview ─────── */}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <div
                    id="preferences-panel"
                    role="tabpanel"
                    aria-labelledby={stepTabId("preferences", active)}
                    className="relative overflow-hidden rounded-[24px] border border-border-subtle bg-[radial-gradient(90%_60%_at_0%_0%,oklch(0.82_0.2_145/0.06),transparent_60%)] p-6 sm:p-9"
                >
                    {/* Keyed on the group so each one replays its entrance. */}
                    <div key={active} className="ob-step" data-dir={direction}>
                        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-accent-text">
                            {String(index + 1).padStart(2, "0")} · {GROUP_LABEL[active]}
                        </p>
                        <h2 className="mt-2 text-[26px] font-semibold leading-[1.1] tracking-[-0.04em] text-fg-primary sm:text-[30px]">
                            {step.title}
                        </h2>
                        <p className="mt-2.5 max-w-[56ch] text-sm leading-relaxed text-fg-tertiary">{step.description}</p>

                        <div className="mt-8">
                            {onRoute ? (
                                <Screen draft={draft} update={update} goTo={noGoTo} catalogue={catalogue} />
                            ) : (
                                <div className="ob-rise flex items-start gap-3 rounded-card border border-border-subtle bg-white/2 p-4 text-sm text-fg-secondary">
                                    <Globe2 className="mt-0.5 size-4 shrink-0 text-accent" />
                                    <p>
                                        You chose anywhere in the world, so Jobak searches remote jobs only. Pick MENA
                                        countries under{" "}
                                        <button
                                            type="button"
                                            onClick={() => open("location")}
                                            className="text-fg-primary underline decoration-white/25 underline-offset-2 hover:decoration-accent"
                                        >
                                            Location
                                        </button>{" "}
                                        to choose hybrid or on-site as well.
                                    </p>
                                </div>
                            )}
                        </div>

                        {error?.stepId === active && (
                            <p key={error.message} role="alert" className="ob-shake mt-6 text-sm text-status-rose">
                                {error.message}
                            </p>
                        )}
                    </div>

                    <div className="mt-10 flex items-center justify-between gap-3 border-t border-border-subtle pt-5">
                        {previous ? (
                            <Button variant="quiet" onClick={() => open(previous)}>
                                <ArrowLeft /> {GROUP_LABEL[previous]}
                            </Button>
                        ) : (
                            <span />
                        )}
                        {next && (
                            <Button variant="secondary" onClick={() => open(next)} className="group">
                                {GROUP_LABEL[next]}
                                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* The same live preview onboarding shows. Wide screens only: on a phone it would push the form down. */}
                <aside className="hidden xl:block">
                    <div className="sticky top-6 h-[min(720px,calc(100dvh-3rem))]">
                        <SearchPreview draft={draft} stepId={active} />
                    </div>
                </aside>
            </div>

            {/* Floats over the page while there is something to save, or just was. */}
            <div
                aria-live="polite"
                className={cn(
                    "sticky bottom-5 z-20 mx-auto mt-6 flex max-w-3xl items-center gap-3 rounded-card border border-border-standard bg-bg-panel/95 py-2.5 pl-4 pr-2.5 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.8)] transition-[opacity,translate] duration-300",
                    dirty || justSaved || saving || error ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
                )}
            >
                <p className="min-w-0 flex-1 truncate text-[13px] text-fg-secondary">
                    {saving ? (
                        "Saving…"
                    ) : error && error.stepId === null ? (
                        <span role="alert" className="text-status-rose">
                            {error.message}
                        </span>
                    ) : dirty ? (
                        `Unsaved changes in ${changed.map((id) => GROUP_LABEL[id]).join(", ")}.`
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-accent-text">
                            <Check className="size-3.5" /> Saved. Your next search uses these.
                        </span>
                    )}
                </p>
                {dirty && (
                    <Button variant="quiet" onClick={discard} disabled={saving}>
                        <RotateCcw /> Discard
                    </Button>
                )}
                <Button variant="primary" onClick={save} disabled={!dirty || saving}>
                    {saving ? <Loader2 className="animate-spin" /> : <Check />}
                    Save preferences
                </Button>
            </div>
        </div>
    );
}
