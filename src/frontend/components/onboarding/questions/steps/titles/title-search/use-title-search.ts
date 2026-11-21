"use client";

import { useMemo, useState } from "react";

import { useJobTitleSearch } from "@/frontend/lib/api/job-catalogue";
import { useDebouncedValue } from "@/frontend/hooks/ui/use-debounced-value";
import { errorMessageOf } from "@/frontend/lib/errors";
import { MIN_QUERY_LENGTH } from "@/shared/contracts/job-catalogue";

/** How long typing must pause before the search runs. */
const DEBOUNCE_MS = 160;

/**
 * The title search's state and keys: what's typed, the results for it, which
 * one is highlighted, and adding or removing a title.
 *
 * Only catalogue titles can be added — there is no "add what I typed" — so a
 * user's titles are always ones the collector and the matcher also know. The
 * server checks this again on save (`ResolveTitlesUseCase`).
 */
export function useTitleSearch({ values, onChange }: { values: string[]; onChange: (next: string[]) => void }) {
    const [text, setText] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);

    const query = text.trim();
    const settled = useDebouncedValue(query, DEBOUNCE_MS);
    const search = useJobTitleSearch(settled);

    const longEnough = query.length >= MIN_QUERY_LENGTH;
    // Results only for a query long enough to search; anything kept from before is stale.
    const results = longEnough ? (search.data ?? []) : [];
    const activeIndex = results.length ? Math.min(active, results.length - 1) : 0;
    // Still typing, or the request for what was typed is in flight.
    const loading = longEnough && (settled !== query || search.isFetching);

    const chosen = useMemo(() => new Set(values.map((v) => v.toLowerCase())), [values]);

    function type(next: string) {
        setText(next);
        setOpen(true);
        setActive(0);
    }

    function add(title: string) {
        if (!chosen.has(title.toLowerCase())) onChange([...values, title]);
        setText("");
        setOpen(false);
    }

    function remove(title: string) {
        onChange(values.filter((v) => v !== title));
    }

    /** An ARIA combobox: arrows move through the results, Enter adds the highlighted one, Escape closes. */
    function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown" && results.length) {
            event.preventDefault();
            setOpen(true);
            setActive((activeIndex + 1) % results.length);
        } else if (event.key === "ArrowUp" && results.length) {
            event.preventDefault();
            setActive((activeIndex - 1 + results.length) % results.length);
        } else if (event.key === "Enter") {
            // Never submits free text: Enter only ever adds a catalogue result.
            event.preventDefault();
            const pick = results[activeIndex];
            if (open && pick) add(pick.title);
        } else if (event.key === "Escape") {
            setOpen(false);
        }
    }

    /** What the list says when it has no results to show. */
    const emptyMessage = search.error
        ? errorMessageOf(search.error)
        : loading
          ? "Searching…"
          : `No title matches “${settled}”. Try a shorter or more common word.`;

    return {
        text,
        type,
        onKeyDown,
        open,
        setOpen,
        showList: open && longEnough,
        results,
        activeIndex,
        setActive,
        loading,
        emptyMessage,
        chosen,
        add,
        remove,
    };
}
