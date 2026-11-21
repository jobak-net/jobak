import { Check } from "lucide-react";

import { cn } from "@/frontend/lib/utils/utils";
import type { JobTitleMatch } from "@/shared/contracts/job-catalogue";

/** The dropdown of matching titles, each with its field; the highlighted one follows the keys. */
export function TitleResults({
    id,
    listId,
    label,
    results,
    activeIndex,
    chosen,
    fieldLabel,
    emptyMessage,
    onPick,
    onHover,
}: {
    id: string;
    listId: string;
    label: string;
    results: JobTitleMatch[];
    activeIndex: number;
    chosen: Set<string>;
    fieldLabel: Map<string, string>;
    emptyMessage: string;
    onPick: (title: string) => void;
    onHover: (index: number) => void;
}) {
    return (
        <ul
            id={listId}
            role="listbox"
            aria-label={`${label} results`}
            className="ob-rise absolute inset-x-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-card border border-border-standard bg-bg-panel p-1 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.7)]"
        >
            {results.map((match, i) => {
                const isChosen = chosen.has(match.title.toLowerCase());
                return (
                    <li
                        key={match.title}
                        id={`${id}-option-${i}`}
                        role="option"
                        aria-selected={i === activeIndex}
                        // mousedown, not click: keeps focus in the input so blur doesn't close the list first.
                        onMouseDown={(event) => {
                            event.preventDefault();
                            onPick(match.title);
                        }}
                        onMouseEnter={() => onHover(i)}
                        className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-sm",
                            i === activeIndex ? "bg-white/6 text-fg-primary" : "text-fg-secondary",
                        )}
                    >
                        <span className="min-w-0 flex-1 truncate">{match.title}</span>
                        <span className="shrink-0 text-[12px] text-fg-quaternary">
                            {fieldLabel.get(match.field) ?? match.field}
                        </span>
                        {isChosen && <Check className="size-4 shrink-0 text-accent" />}
                    </li>
                );
            })}

            {results.length === 0 && (
                <li className="px-3 py-2.5 text-[13px] text-fg-tertiary" role="presentation">
                    {emptyMessage}
                </li>
            )}
        </ul>
    );
}
