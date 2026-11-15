"use client";

import { JOB_TYPE_LABEL, SENIORITY_LABEL } from "@/frontend/components/onboarding/labels";
import { FilterChip } from "@/frontend/components/ui";
import { detailsRules } from "@/shared/onboarding/rules/details";
import { JOB_TYPES, SENIORITIES } from "@/shared/preferences/search-rules";

import type { StepScreenProps, StepStrategy } from "./step-strategy";
import { riseStyle } from "../parts/rise-style";
import { toggle } from "../parts/toggle";

function DetailsScreen({ draft, update }: StepScreenProps) {
    return (
        <div className="space-y-8">
            <fieldset className="ob-rise" style={riseStyle(0)}>
                <legend className="text-sm font-medium text-fg-secondary">Contract type</legend>
                <p className="mt-0.5 text-[13px] text-fg-tertiary">Leave empty to see every type.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                    {JOB_TYPES.map((type) => (
                        <FilterChip
                            key={type}
                            selected={draft.jobTypes.includes(type)}
                            onClick={() => update({ jobTypes: toggle(draft.jobTypes, type) })}
                        >
                            {JOB_TYPE_LABEL[type]}
                        </FilterChip>
                    ))}
                </div>
            </fieldset>

            <fieldset className="ob-rise" style={riseStyle(1)}>
                <legend className="text-sm font-medium text-fg-secondary">Seniority</legend>
                <p className="mt-0.5 text-[13px] text-fg-tertiary">The level you&apos;re aiming for.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <FilterChip neutral selected={draft.seniority === null} onClick={() => update({ seniority: null })}>
                        Any level
                    </FilterChip>
                    {SENIORITIES.map((level) => (
                        <FilterChip
                            key={level}
                            selected={draft.seniority === level}
                            onClick={() => update({ seniority: level })}
                        >
                            {SENIORITY_LABEL[level]}
                        </FilterChip>
                    ))}
                </div>
            </fieldset>
        </div>
    );
}

/** Contract type and seniority. Both optional. */
export const detailsStep: StepStrategy = { ...detailsRules, Screen: DetailsScreen };
