"use client";

import { useRef, useState } from "react";

import { cn } from "@/frontend/lib/utils/utils";

export interface StepTab<Id extends string> {
    id: Id;
    label: string;
    /** One line under the label: the tab's current answer, readable without opening it. */
    summary: string;
    /** Red number: something in this tab needs fixing. */
    error?: boolean;
    /** Green dot: this tab has unsaved changes. */
    changed?: boolean;
}

/**
 * Numbered tabs, centred, each showing its current answer — the dashboard's
 * version of the onboarding's step-by-step, for pages that edit what
 * onboarding asked (Preferences, Settings).
 *
 * The ARIA tabs pattern: one tab in the tab order, arrows move between them
 * (wrapping), Home/End jump to the ends. The panel it controls must have
 * `id={panelId}`, `role="tabpanel"` and `aria-labelledby={tabId(active)}`.
 */
export function StepTabs<Id extends string>({
    tabs,
    active,
    onSelect,
    label,
    panelId,
    idPrefix,
}: {
    tabs: StepTab<Id>[];
    active: Id;
    onSelect: (id: Id) => void;
    label: string;
    panelId: string;
    idPrefix: string;
}) {
    const refs = useRef<Record<string, HTMLButtonElement | null>>({});
    const index = tabs.findIndex((tab) => tab.id === active);

    function onKeyDown(event: React.KeyboardEvent) {
        const last = tabs.length - 1;
        const target: Record<string, number> = {
            ArrowRight: index === last ? 0 : index + 1,
            ArrowLeft: index === 0 ? last : index - 1,
            Home: 0,
            End: last,
        };
        if (!(event.key in target)) return;
        event.preventDefault();
        const next = tabs[target[event.key]!]!;
        onSelect(next.id);
        refs.current[next.id]?.focus();
    }

    return (
        <div className="mb-8 flex justify-center">
            <div
                role="tablist"
                aria-label={label}
                onKeyDown={onKeyDown}
                className={cn(
                    "grid w-full max-w-3xl gap-1 rounded-2xl border border-border-subtle bg-white/2 p-1",
                    tabs.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-3",
                )}
            >
                {tabs.map((tab, i) => {
                    const selected = tab.id === active;
                    return (
                        <button
                            key={tab.id}
                            ref={(el) => {
                                refs.current[tab.id] = el;
                            }}
                            type="button"
                            role="tab"
                            id={`${idPrefix}-tab-${tab.id}`}
                            aria-selected={selected}
                            aria-controls={panelId}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => onSelect(tab.id)}
                            className={cn(
                                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-[background-color,box-shadow] duration-300",
                                selected ? "bg-white/6 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset]" : "hover:bg-white/3",
                            )}
                        >
                            <span
                                className={cn(
                                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums transition-colors duration-300",
                                    tab.error
                                        ? "border-status-rose text-status-rose"
                                        : selected
                                          ? "border-accent bg-accent text-[#06210f]"
                                          : "border-border-strong text-fg-tertiary group-hover:text-fg-secondary",
                                )}
                            >
                                {i + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span
                                    className={cn(
                                        "block text-[13px] font-medium transition-colors",
                                        selected ? "text-fg-primary" : "text-fg-secondary",
                                    )}
                                >
                                    {tab.label}
                                </span>
                                <span className="block truncate text-[12px] text-fg-quaternary">{tab.summary}</span>
                            </span>
                            {tab.changed && (
                                <span className="ob-pop size-1.5 shrink-0 rounded-full bg-accent" title="Unsaved changes">
                                    <span className="sr-only">Unsaved changes</span>
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** The id `StepTabs` gives a tab, for the panel's `aria-labelledby`. */
export const stepTabId = (idPrefix: string, id: string) => `${idPrefix}-tab-${id}`;

/**
 * Remembers which way the active tab moved, so its panel slides in from that
 * side (`data-dir` on an `.ob-step`). React's "store information from
 * previous renders": a state update during render, no effect.
 */
export function useSlideDirection<Id>(active: Id, index: number): "forward" | "back" {
    const [shown, setShown] = useState<{ id: Id; index: number; dir: "forward" | "back" }>({
        id: active,
        index,
        dir: "forward",
    });
    if (shown.id !== active) setShown({ id: active, index, dir: index >= shown.index ? "forward" : "back" });
    return shown.dir;
}
