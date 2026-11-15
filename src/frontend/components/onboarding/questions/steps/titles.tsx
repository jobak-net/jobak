"use client";

import { useMemo } from "react";

import { TagInput } from "@/frontend/components/onboarding/tag-input";
import { TitleSearch } from "@/frontend/components/onboarding/title-search";
import { FilterChip, SearchableSelect } from "@/frontend/components/ui";
import { titlesForField } from "@/frontend/lib/configs/job-titles";
import { titlesRules } from "@/shared/onboarding/rules/titles";

import type { StepScreenProps, StepStrategy } from "./step-strategy";
import { riseStyle } from "../parts/rise-style";
import { toggle } from "../parts/toggle";

function TitlesScreen({ draft, update, catalogue }: StepScreenProps) {
    const suggestions = useMemo(
        () => (draft.field ? titlesForField(catalogue, draft.field) : []),
        [catalogue, draft.field],
    );
    const fieldOptions = useMemo(
        () => catalogue.map((field) => ({ value: field.value, label: field.label })),
        [catalogue],
    );

    return (
        /*
         * Each section's entrance animation (`ob-rise`, which keeps its
         * transform/opacity applied) makes it a stacking context, so a dropdown's
         * own z-index only counts inside its section — the next section painted
         * over the open list. `focus-within:z-20` lifts whichever section holds
         * the focused input (its list is open exactly while it's focused) above
         * the others.
         */
        <div className="space-y-8">
            {catalogue.length > 0 && (
                <div className="ob-rise relative focus-within:z-20" style={riseStyle(0)}>
                    <label htmlFor="onboarding-field" className="text-sm font-medium text-fg-secondary">
                        Your field
                    </label>
                    <p className="mt-0.5 text-[13px] text-fg-tertiary">Optional. Shows common titles to pick from.</p>
                    <SearchableSelect
                        id="onboarding-field"
                        value={draft.field}
                        onChange={(field) => update({ field })}
                        options={fieldOptions}
                        placeholder="Search fields, e.g. engineering, healthcare"
                        className="mt-2.5 sm:max-w-sm"
                    />

                    {suggestions.length > 0 && (
                        // Keyed on the field so a new field's suggestions arrive together.
                        <div key={draft.field} className="mt-4 flex flex-wrap gap-2" aria-label="Suggested titles">
                            {suggestions.map((title, i) => (
                                <span key={title} className="ob-rise" style={riseStyle(i)}>
                                    <FilterChip
                                        selected={draft.jobTitles.includes(title)}
                                        onClick={() => update({ jobTitles: toggle(draft.jobTitles, title) })}
                                        className="normal-case"
                                    >
                                        {title}
                                    </FilterChip>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="ob-rise relative focus-within:z-20" style={riseStyle(1)}>
                <TitleSearch
                    label="Job titles"
                    hint="Search our list of job titles and add every one you'd apply for. At least one."
                    values={draft.jobTitles}
                    onChange={(jobTitles) => update({ jobTitles })}
                    fields={catalogue}
                />
            </div>

            <div className="ob-rise" style={riseStyle(2)}>
                <TagInput
                    label="Keywords"
                    hint="Optional. Skills, tools or industries to look for in postings."
                    values={draft.keywords}
                    onChange={(keywords) => update({ keywords })}
                    placeholder="e.g. React, fintech, Arabic"
                />
            </div>
        </div>
    );
}

/** The roles to search for, plus optional keywords. */
export const titlesStep: StepStrategy = { ...titlesRules, Screen: TitlesScreen };
