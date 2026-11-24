"use client";

import { useId, useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { cn } from "@/frontend/shared/lib";

import { Input } from "./field";

export interface SelectOption {
    value: string;
    label: string;
}

/**
 * A select you can type into: the list narrows to the options whose label
 * contains what was typed. For lists too long to scan, like the job fields.
 *
 * An ARIA combobox, like `TitleSearch`: focus or ↓ opens the list, arrows move,
 * Enter picks, Escape closes. Closed, the input shows the chosen option; the ×
 * clears it. Filtering is local — the options are already on the page.
 */
export function SearchableSelect({
    id: idProp,
    value,
    onChange,
    options,
    placeholder = "Search",
    className,
}: {
    /** For a `<label htmlFor>` pointing at the input. */
    id?: string;
    value: string | null;
    onChange: (value: string | null) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
}) {
    const autoId = useId();
    const id = idProp ?? autoId;
    const listId = `${id}-options`;
    const optionId = (i: number) => `${id}-option-${i}`;

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);

    const selected = options.find((option) => option.value === value) ?? null;
    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? options.filter((option) => option.label.toLowerCase().includes(q)) : options;
    }, [options, query]);

    function openList() {
        setOpen(true);
        setQuery("");
        // Start on the current choice, so ↓ continues from where the user is.
        setActive(Math.max(0, options.findIndex((option) => option.value === value)));
    }

    function close() {
        setOpen(false);
        setQuery("");
    }

    function choose(option: SelectOption) {
        onChange(option.value);
        close();
    }

    function moveTo(index: number) {
        setActive(index);
        document.getElementById(optionId(index))?.scrollIntoView({ block: "nearest" });
    }

    function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) return openList();
            if (matches.length === 0) return;
            const step = event.key === "ArrowDown" ? 1 : -1;
            moveTo((active + step + matches.length) % matches.length);
        } else if (event.key === "Enter") {
            // Never submits a form: Enter only ever picks an option.
            event.preventDefault();
            const pick = matches[active];
            if (open && pick) choose(pick);
        } else if (event.key === "Escape" && open) {
            event.preventDefault();
            close();
        }
    }

    const activeId = open && matches[active] ? optionId(active) : undefined;

    return (
        <div className={cn("relative", className)}>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-quaternary" />
            <Input
                id={id}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls={listId}
                aria-activedescendant={activeId}
                autoComplete="off"
                // Closed: the choice. Open: what's being typed, with the choice as a hint.
                value={open ? query : (selected?.label ?? "")}
                placeholder={open && selected ? selected.label : placeholder}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setOpen(true);
                    setActive(0);
                }}
                onKeyDown={onKeyDown}
                onFocus={openList}
                onBlur={close}
                className="pl-9 pr-9"
            />

            {selected && !open ? (
                <button
                    type="button"
                    aria-label={`Clear ${selected.label}`}
                    // mousedown, not click: acts before the input's blur/focus handling.
                    onMouseDown={(event) => {
                        event.preventDefault();
                        onChange(null);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-fg-tertiary hover:bg-white/5 hover:text-fg-primary"
                >
                    <X className="size-3.5" />
                </button>
            ) : (
                <ChevronDown
                    className={cn(
                        "pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-quaternary transition-transform",
                        open && "rotate-180",
                    )}
                />
            )}

            {open && (
                <ul
                    id={listId}
                    role="listbox"
                    className="ob-rise absolute inset-x-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-card border border-border-standard bg-bg-panel p-1 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.7)]"
                >
                    {matches.map((option, i) => (
                        <li
                            key={option.value}
                            id={optionId(i)}
                            role="option"
                            aria-selected={option.value === value}
                            // mousedown, not click: keeps focus in the input so blur doesn't close the list first.
                            onMouseDown={(event) => {
                                event.preventDefault();
                                choose(option);
                            }}
                            onMouseEnter={() => setActive(i)}
                            className={cn(
                                "flex cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-sm",
                                i === active ? "bg-white/6 text-fg-primary" : "text-fg-secondary",
                            )}
                        >
                            <span className="min-w-0 flex-1 truncate">{option.label}</span>
                            {option.value === value && <Check className="size-4 shrink-0 text-accent" />}
                        </li>
                    ))}

                    {matches.length === 0 && (
                        <li className="px-3 py-2.5 text-[13px] text-fg-tertiary" role="presentation">
                            Nothing matches “{query.trim()}”.
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
