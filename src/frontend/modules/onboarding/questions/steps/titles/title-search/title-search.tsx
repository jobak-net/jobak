"use client";

import { useId, useMemo } from "react";
import { Loader2, Search } from "lucide-react";

import { Input } from "@/frontend/shared/ui";
import type { JobField } from "@/shared/contracts/job-catalogue";

import { ChosenTitles } from "./chosen-titles";
import { OnetCredit } from "./onet-credit";
import { TitleResults } from "./title-results";
import { useTitleSearch } from "./use-title-search";

/**
 * Picks job titles from the catalogue by searching it
 * (`GET /api/v1/job-titles`, through `useJobTitleSearch`).
 *
 *     use-title-search.ts   what's typed, the results, the keys, add / remove
 *     title-results.tsx     the dropdown of matches
 *     chosen-titles.tsx     the titles added so far
 *     onet-credit.tsx       the licence credit O*NET requires
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
    const search = useTitleSearch({ values, onChange });
    const fieldLabel = useMemo(() => new Map(fields.map((f) => [f.value, f.label])), [fields]);
    const activeId = search.showList && search.results[search.activeIndex] ? `${id}-option-${search.activeIndex}` : undefined;

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
                    aria-expanded={search.showList}
                    aria-controls={listId}
                    aria-activedescendant={activeId}
                    autoComplete="off"
                    value={search.text}
                    onChange={(event) => search.type(event.target.value)}
                    onKeyDown={search.onKeyDown}
                    onFocus={() => search.setOpen(true)}
                    onBlur={() => search.setOpen(false)}
                    placeholder="Search job titles, e.g. nurse, accountant, frontend"
                    className="pl-9 pr-9"
                />
                {search.loading && (
                    <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-fg-quaternary" />
                )}

                {search.showList && (
                    <TitleResults
                        id={id}
                        listId={listId}
                        label={label}
                        results={search.results}
                        activeIndex={search.activeIndex}
                        chosen={search.chosen}
                        fieldLabel={fieldLabel}
                        emptyMessage={search.emptyMessage}
                        onPick={search.add}
                        onHover={search.setActive}
                    />
                )}
            </div>

            <OnetCredit />

            <ChosenTitles label={label} values={values} onRemove={search.remove} />
        </div>
    );
}
