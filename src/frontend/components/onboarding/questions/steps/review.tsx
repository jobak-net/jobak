"use client";

import { Pencil } from "lucide-react";

import { JOB_TYPE_LABEL, SENIORITY_LABEL, WORK_MODE_LABEL } from "@/frontend/components/onboarding/labels";
import { countryName } from "@/frontend/lib/configs/countries";
import { reviewRules } from "@/shared/onboarding/rules/review";
import type { StepId } from "@/shared/onboarding/step-rules";

import type { StepScreenProps, StepStrategy } from "./step-strategy";
import { riseStyle } from "../parts/rise-style";

function ReviewScreen({ draft, goTo }: StepScreenProps) {
    const list = (values: string[], empty: string) => (values.length ? values.join(", ") : empty);

    const rows: { label: string; value: string; edit: StepId }[] = [
        {
            label: "Location",
            value: draft.location.worldwide
                ? "Anywhere in the world"
                : list(draft.location.countries.map(countryName), "Not set"),
            edit: "location",
        },
        {
            label: "Work mode",
            value: draft.location.worldwide
                ? "Remote only (anywhere in the world)"
                : list(draft.workModes.map((m) => WORK_MODE_LABEL[m]), "Not set"),
            // Worldwide fixes the work mode, so its answer is changed on the location step.
            edit: draft.location.worldwide ? "location" : "workMode",
        },
        { label: "Job titles", value: list(draft.jobTitles, "Not set"), edit: "titles" },
        { label: "Keywords", value: list(draft.keywords, "None"), edit: "titles" },
        { label: "Contract type", value: list(draft.jobTypes.map((t) => JOB_TYPE_LABEL[t]), "Any"), edit: "details" },
        { label: "Seniority", value: draft.seniority ? SENIORITY_LABEL[draft.seniority] : "Any level", edit: "details" },
    ];

    return (
        <dl className="divide-y divide-border-subtle overflow-hidden rounded-card border border-border-subtle bg-white/2">
            {rows.map((row, i) => (
                <div key={row.label} className="ob-rise flex items-start gap-4 px-4 py-3.5 sm:px-5" style={riseStyle(i)}>
                    <dt className="w-32 shrink-0 pt-0.5 text-[13px] text-fg-tertiary">{row.label}</dt>
                    <dd className="min-w-0 flex-1 text-sm text-fg-primary">{row.value}</dd>
                    <button
                        type="button"
                        onClick={() => goTo(row.edit)}
                        aria-label={`Edit ${row.label.toLowerCase()}`}
                        className="flex items-center gap-1 rounded-control px-2 py-1 text-[13px] text-fg-tertiary transition-colors hover:bg-white/4 hover:text-fg-primary"
                    >
                        <Pencil className="size-3.5" /> Edit
                    </button>
                </div>
            ))}
        </dl>
    );
}

/** The answers, read back with an edit link per row. The last step. */
export const reviewStep: StepStrategy = { ...reviewRules, Screen: ReviewScreen };
