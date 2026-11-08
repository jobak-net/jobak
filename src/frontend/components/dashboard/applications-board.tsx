"use client";

import { useState } from "react";
import { ChevronRight, StickyNote } from "lucide-react";

import {
    APPLICATION_STAGES,
    type Application,
    type ApplicationStage,
} from "@/frontend/lib/mocks/dashboard";

/**
 * The application tracker as columns.
 *
 * Moving a card is local state only — there is no applications table yet — so
 * the board behaves the way it will, and forgets on reload.
 */
export function ApplicationsBoard({ initial }: { initial: Application[] }) {
    const [applications, setApplications] = useState(initial);

    function advance(id: string) {
        setApplications((list) =>
            list.map((application) => {
                if (application.id !== id) return application;
                const order = APPLICATION_STAGES.map((s) => s.id);
                const next = order[Math.min(order.indexOf(application.stage) + 1, order.length - 1)] as ApplicationStage;
                return { ...application, stage: next, updated: "Just now" };
            }),
        );
    }

    return (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            <div className="grid min-w-[960px] grid-cols-5 gap-4">
                {APPLICATION_STAGES.map((stage, column) => {
                    const cards = applications.filter((application) => application.stage === stage.id);
                    const isLast = column === APPLICATION_STAGES.length - 1;

                    return (
                        <section
                            key={stage.id}
                            className="dash-enter rounded-card border border-border-subtle bg-white/1.5 p-3"
                            style={{ "--dash-delay": `${column * 60}ms` } as React.CSSProperties}
                        >
                            <header className="mb-3 flex items-center justify-between px-1">
                                <h2 className="flex items-center gap-2 text-[13px] font-medium text-fg-secondary">
                                    <i aria-hidden="true" className="size-2 rounded-full" style={{ background: stage.color }} />
                                    {stage.label}
                                </h2>
                                <span className="font-mono text-[11px] text-fg-quaternary">{cards.length}</span>
                            </header>

                            <ul className="space-y-2">
                                {cards.map((application) => (
                                    <li
                                        key={application.id}
                                        className="group rounded-control border border-border-subtle bg-(image:--surface-2) p-3 transition-colors hover:border-border-strong"
                                    >
                                        <p className="text-[13px] font-medium leading-snug text-fg-primary">{application.title}</p>
                                        <p className="mt-0.5 text-xs text-fg-tertiary">{application.company}</p>
                                        {application.note && (
                                            <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-fg-secondary">
                                                <StickyNote className="mt-px size-3 shrink-0 text-fg-quaternary" />
                                                {application.note}
                                            </p>
                                        )}
                                        <div className="mt-3 flex items-center justify-between">
                                            <span className="font-mono text-[10px] text-fg-quaternary">{application.updated}</span>
                                            {!isLast && (
                                                <button
                                                    type="button"
                                                    onClick={() => advance(application.id)}
                                                    className="flex items-center gap-0.5 rounded-chip px-1.5 py-0.5 text-[11px] text-fg-tertiary opacity-0 transition-opacity hover:bg-white/5 hover:text-fg-primary focus-visible:opacity-100 group-hover:opacity-100"
                                                >
                                                    Move on <ChevronRight className="size-3" />
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                                {cards.length === 0 && (
                                    <li className="rounded-control border border-dashed border-border-standard px-3 py-6 text-center text-xs text-fg-quaternary">
                                        Nothing here
                                    </li>
                                )}
                            </ul>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
