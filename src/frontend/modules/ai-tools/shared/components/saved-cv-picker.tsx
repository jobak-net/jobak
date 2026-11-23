"use client";

import { useState } from "react";
import { CircleAlert, FileText, Trash2 } from "lucide-react";

import { cn } from "@/frontend/shared/lib";
import type { SavedCv } from "@/shared/contracts/applicant";

/** "PDF, 2 pages", "Word document", "Pasted text". */
function describe(cv: SavedCv): string {
  if (cv.source === "pdf") return `PDF, ${cv.pages ?? 1} page${cv.pages === 1 ? "" : "s"}`;
  return cv.source === "docx" ? "Word document" : "Pasted text";
}

/** "Used today", "Used yesterday", "Used 12 Nov". */
function usedOn(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Used today";
  if (days === 1) return "Used yesterday";
  return `Used ${new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(iso))}`;
}

/**
 * The user's saved CVs as a list to pick from, most recently used first.
 * Each can be deleted, after a confirm in place (it can't be undone).
 */
export function SavedCvPicker({
    cvs,
    selectedId,
    onSelect,
    onRemove,
    error,
}: {
    cvs: SavedCv[];
    selectedId: string | null;
    onSelect: (cv: SavedCv) => void;
    onRemove: (id: string) => void;
    /** Why a delete failed, if it did. */
    error: string | null;
}) {
    const [confirming, setConfirming] = useState<string | null>(null);

    return (
        <div>
            <ul role="radiogroup" aria-label="Your saved CVs" className="space-y-2">
                {cvs.map((cv) => {
                    const selected = cv.id === selectedId;
                    return (
                        <li
                            key={cv.id}
                            className={cn(
                                "flex items-center gap-3 rounded-card border p-3 transition-colors",
                                selected ? "border-accent/60 bg-accent/6" : "border-border-standard hover:bg-white/2.5",
                            )}
                        >
                            <button
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => onSelect(cv)}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                                <span
                                    className={cn(
                                        "flex size-9 shrink-0 items-center justify-center rounded-control",
                                        selected ? "bg-accent/15 text-accent" : "bg-white/5 text-fg-tertiary",
                                    )}
                                >
                                    <FileText className="size-4" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-fg-primary">{cv.label}</span>
                                    <span className="block text-xs text-fg-tertiary">
                                        {describe(cv)}. {usedOn(cv.lastUsedAt)}
                                    </span>
                                </span>
                            </button>
                            {confirming === cv.id ? (
                                <span className="flex shrink-0 items-center gap-1 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setConfirming(null);
                                            onRemove(cv.id);
                                        }}
                                        className="rounded-control px-2 py-1 font-medium text-status-rose hover:bg-status-rose/10"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirming(null)}
                                        className="rounded-control px-2 py-1 text-fg-tertiary hover:bg-white/5 hover:text-fg-primary"
                                    >
                                        Keep
                                    </button>
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setConfirming(cv.id)}
                                    aria-label={`Delete ${cv.label}`}
                                    className="shrink-0 rounded-control p-1.5 text-fg-quaternary hover:bg-white/5 hover:text-status-rose"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>
            {error && (
                <p role="alert" className="mt-2 flex items-start gap-2 text-[13px] text-status-rose">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
                </p>
            )}
        </div>
    );
}
