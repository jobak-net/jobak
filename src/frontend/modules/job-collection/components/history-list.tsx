"use client";

import { History } from "lucide-react";

import { countryLabel } from "../config/country-codes";
import type { HistoryEntry } from "../lib/history";

function ago(iso: string): string {
    const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
    if (Number.isNaN(minutes)) return "";
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    return `${Math.round(hours / 24)} days ago`;
}

/** The last searches on this device. Opening one reads its runs from Apify again, or carries on following them. */
export function HistoryList({ entries, onOpen, disabled }: { entries: HistoryEntry[]; onOpen: (entry: HistoryEntry) => void; disabled: boolean }) {
    if (entries.length === 0) return null;
    return (
        <section>
            <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-medium text-fg-secondary">
                <History className="size-3.5" /> Recent searches on this device
            </h2>
            <ul className="flex flex-wrap gap-2">
                {entries.map((entry) => (
                    <li key={entry.id}>
                        <button
                            type="button"
                            disabled={disabled || entry.runs.length === 0}
                            onClick={() => onOpen(entry)}
                            className="rounded-full border border-border-standard bg-white/2 px-3 py-1.5 text-[12px] text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary disabled:opacity-50"
                        >
                            {entry.search.title} in {countryLabel(entry.search.country)}, {entry.runs.length}{" "}
                            {entry.runs.length === 1 ? "site" : "sites"}, {ago(entry.startedAt)}
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
