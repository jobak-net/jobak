"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";

import { searchJobTitlesAction } from "@/backend/actions/job-titles";
import { MIN_QUERY_LENGTH, type JobTitleMatch } from "@/backend/modules/job-catalogue/domain/job-catalogue";
import { Chip, Input } from "@/frontend/components/ui";
import type { JobField } from "@/frontend/lib/configs/job-titles";
import { cn } from "@/frontend/lib/utils/utils";

const DEBOUNCE_MS = 160;

/**
 * Picks job titles from the catalogue by searching it.
 *
 * Only catalogue titles can be added — there is no "add what I typed" — so a
 * user's titles are always ones the collector and the matcher also know. The
 * server checks this again on save (`ResolveTitlesUseCase`).
 *
 * An ARIA combobox: arrows move through the results, Enter adds the
 * highlighted one, Escape closes the list. Requests are debounced, and a
 * response that arrives after a newer one was sent is dropped, so fast typing
 * never shows results for an old query.
 */
export function TitleSearch({
    label,
    hint,
    values,
    onChange,
    fields,
}: {
    label: string;
    hint?: string;
    values: string[];
    onChange: (next: string[]) => void;
    fields: JobField[];
}) {
    const id = useId();
    const listId = `${id}-results`;
    const [text, setText] = useState("");
    const [results, setResults] = useState<JobTitleMatch[]>([]);
    const [searchedFor, setSearchedFor] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latest = useRef(0);

    const fieldLabel = useMemo(() => new Map(fields.map((f) => [f.value, f.label])), [fields]);
    const chosen = useMemo(() => new Set(values.map((v) => v.toLowerCase())), [values]);

    function search(query: string) {
        const request = ++latest.current;
        setLoading(true);
        searchJobTitlesAction(query)
            .then((found) => {
                if (request !== latest.current) return;
                setResults(found);
                setSearchedFor(query);
                setActive(0);
            })
            .catch(() => {
                if (request === latest.current) setResults([]);
            })
            .finally(() => {
                if (request === latest.current) setLoading(false);
            });
    }

    function onType(next: string) {
        setText(next);
        setOpen(true);
        if (timer.current) clearTimeout(timer.current);

        if (next.trim().length < MIN_QUERY_LENGTH) {
            latest.current++; // drop anything in flight
            setResults([]);
            setSearchedFor(null);
            setLoading(false);
            return;
        }
        timer.current = setTimeout(() => search(next.trim()), DEBOUNCE_MS);
    }

    function add(title: string) {
        if (!chosen.has(title.toLowerCase())) onChange([...values, title]);
        setText("");
        setResults([]);
        setSearchedFor(null);
        setOpen(false);
    }

    function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown" && results.length) {
            event.preventDefault();
            setOpen(true);
            setActive((i) => (i + 1) % results.length);
        } else if (event.key === "ArrowUp" && results.length) {
            event.preventDefault();
            setActive((i) => (i - 1 + results.length) % results.length);
        } else if (event.key === "Enter") {
            // Never submits free text: Enter only ever adds a catalogue result.
            event.preventDefault();
            const pick = results[active];
            if (open && pick) add(pick.title);
        } else if (event.key === "Escape") {
            setOpen(false);
        }
    }

    const showList = open && text.trim().length >= MIN_QUERY_LENGTH;
    const activeId = showList && results[active] ? `${id}-option-${active}` : undefined;

    return (
        <div>
            <label htmlFor={id} className="text-sm font-medium text-fg-secondary">
                {label}
            </label>
            {hint && <p className="mt-0.5 text-[13px] text-fg-tertiary">{hint}</p>}

            <div className="relative mt-2.5">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-quaternary" />
                <Input
                    id={id}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={showList}
                    aria-controls={listId}
                    aria-activedescendant={activeId}
                    autoComplete="off"
                    value={text}
                    onChange={(event) => onType(event.target.value)}
                    onKeyDown={onKeyDown}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setOpen(false)}
                    placeholder="Search job titles, e.g. nurse, accountant, frontend"
                    className="pl-9 pr-9"
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-fg-quaternary" />
                )}

                {showList && (
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
                                    aria-selected={i === active}
                                    // mousedown, not click: keeps focus in the input so blur doesn't close the list first.
                                    onMouseDown={(event) => {
                                        event.preventDefault();
                                        add(match.title);
                                    }}
                                    onMouseEnter={() => setActive(i)}
                                    className={cn(
                                        "flex cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-sm",
                                        i === active ? "bg-white/6 text-fg-primary" : "text-fg-secondary",
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
                                {loading || searchedFor === null
                                    ? "Searching…"
                                    : `No title matches “${searchedFor}”. Try a shorter or more common word.`}
                            </li>
                        )}
                    </ul>
                )}
            </div>

            {/* Required by the O*NET licence (CC BY 4.0) wherever its titles are used. */}
            <p className="mt-2 text-[11px] text-fg-quaternary">
                Job titles include information from{" "}
                <a
                    href="https://www.onetcenter.org/database.html"
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-white/20 underline-offset-2 hover:text-fg-tertiary"
                >
                    O*NET
                </a>{" "}
                by the U.S. Department of Labor, used under CC BY 4.0.
            </p>

            {values.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${label}, added`}>
                    {values.map((value) => (
                        <li key={value}>
                            <Chip className="ob-pop py-1 pl-2.5 pr-1 text-[13px]">
                                {value}
                                <button
                                    type="button"
                                    onClick={() => onChange(values.filter((v) => v !== value))}
                                    aria-label={`Remove ${value}`}
                                    className="rounded p-0.5 text-fg-tertiary hover:bg-white/5 hover:text-fg-primary"
                                >
                                    <X className="size-3" />
                                </button>
                            </Chip>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
