"use client";

import { memo, useCallback, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeftRight, Building2, Check, Globe2, Laptop, Pencil, Search } from "lucide-react";

import {
    JOB_TYPES,
    SENIORITIES,
    WORK_MODES,
    type JobPreferences,
    type WorkMode,
} from "@/backend/modules/preferences/domain/job-preferences";
import type { DraftPatch, StepId } from "@/backend/modules/preferences/domain/onboarding";
import { Flag } from "@/frontend/components/shared/flag";
import { FilterChip, Input } from "@/frontend/components/ui";
import { countries, countryName } from "@/frontend/lib/configs/countries";
import { titlesForField, type JobField } from "@/frontend/lib/configs/job-titles";
import { cn } from "@/frontend/lib/utils/utils";

import { JOB_TYPE_LABEL, SENIORITY_LABEL, WORK_MODE_LABEL } from "./labels";
import { TagInput } from "./tag-input";
import { TitleSearch } from "./title-search";

/**
 * The screen for each onboarding step.
 *
 * Screens only draw and report changes; they hold no rules. What a step needs,
 * whether it is complete and where it leads all live in the State objects
 * (`modules/preferences/domain/onboarding/steps.ts`), so a screen can never
 * let through something the server would refuse.
 */
export interface StepScreenProps {
    draft: JobPreferences;
    update: (patch: DraftPatch) => void;
    goTo: (stepId: StepId) => void;
    catalogue: JobField[];
}

const toggle = <T,>(list: readonly T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/**
 * Staggers a screen's parts in: each gets the next `--i` (see `.ob-rise` in
 * globals.css, which caps the delay at 14). The style objects are made once,
 * so memoised options see the same object on every render.
 */
const RISE_STYLES = Array.from({ length: 15 }, (_, i) => ({ "--i": i }) as CSSProperties);
const riseStyle = (i: number) => RISE_STYLES[Math.min(i, RISE_STYLES.length - 1)];

/**
 * A large selectable card with a radio in its corner — the location and
 * work-mode choices. `stack` puts the icon above the text, for cards in a grid.
 */
const OptionCard = memo(function OptionCard<V extends string>({
    value,
    selected,
    onSelect,
    icon,
    title,
    description,
    layout = "row",
    className,
    style,
}: {
    value: V;
    selected: boolean;
    /** Stable across renders (with `icon` and `style`), so an unchanged card skips re-rendering. */
    onSelect: (value: V) => void;
    icon: React.ReactNode;
    title: string;
    description: string;
    layout?: "row" | "stack";
    className?: string;
    style?: CSSProperties;
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(value)}
            style={style}
            className={cn(
                "group relative flex w-full rounded-card border text-left transition-[background-color,border-color,box-shadow,scale] duration-300 active:scale-[0.985]",
                layout === "row" ? "items-center gap-4 p-4 pr-12" : "flex-col items-start gap-5 p-4 pb-5",
                selected
                    ? "border-accent/55 bg-accent/7 shadow-[0_0_0_1px_oklch(0.82_0.2_145/0.25)_inset,0_18px_40px_-20px_oklch(0.82_0.2_145/0.55)]"
                    : "border-border-standard bg-white/2 hover:border-border-strong hover:bg-white/4",
                className,
            )}
        >
            <span
                className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-control transition-colors duration-300",
                    selected ? "bg-accent/15 text-accent" : "bg-white/5 text-fg-tertiary group-hover:text-fg-secondary",
                )}
            >
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-fg-primary">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-fg-tertiary">{description}</span>
            </span>
            <span
                aria-hidden="true"
                className={cn(
                    "absolute right-3.5 top-3.5 flex size-4.5 items-center justify-center rounded-full border transition-colors duration-300",
                    selected ? "border-accent" : "border-border-strong",
                )}
            >
                {selected && <span className="ob-pop size-2 rounded-full bg-accent" />}
            </span>
        </button>
    );
}) as <V extends string>(props: {
    value: V;
    selected: boolean;
    onSelect: (value: V) => void;
    icon: React.ReactNode;
    title: string;
    description: string;
    layout?: "row" | "stack";
    className?: string;
    style?: CSSProperties;
}) => React.ReactNode;

const GLOBE_ICON = <Globe2 className="size-5" />;

/** One country tile. Memoised: picking a country re-renders that tile, not all of them. */
const CountryOption = memo(function CountryOption({
    code,
    name,
    selected,
    onToggle,
    style,
}: {
    code: string;
    name: string;
    selected: boolean;
    onToggle: (code: string) => void;
    style: CSSProperties;
}) {
    return (
        <li className="ob-rise" style={style}>
            <button
                type="button"
                aria-pressed={selected}
                onClick={() => onToggle(code)}
                className={cn(
                    "flex w-full items-center gap-3 rounded-control border px-3 py-2.5 text-left text-sm transition-[background-color,border-color,color,scale] duration-200 active:scale-[0.98]",
                    selected
                        ? "border-accent/55 bg-accent/7 text-fg-primary"
                        : "border-border-subtle text-fg-secondary hover:border-border-strong hover:text-fg-primary",
                )}
            >
                <Flag code={code} className="rounded-[3px]" />
                <span className="min-w-0 flex-1 truncate">{name}</span>
                {selected && <Check className="ob-pop size-4 text-accent" />}
            </button>
        </li>
    );
});

function LocationScreen({ draft, update }: StepScreenProps) {
    const [search, setSearch] = useState("");
    const { worldwide, countries: selected } = draft.location;
    const shown = countries.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));

    const toggleWorldwide = useCallback(
        () => update((d) => ({ location: { worldwide: !d.location.worldwide, countries: [] } })),
        [update],
    );
    // Picking a country means not worldwide; the rules clear the remote lock that came with it.
    const toggleCountry = useCallback(
        (code: string) =>
            update((d) => ({
                location: { worldwide: false, countries: toggle(d.location.worldwide ? [] : d.location.countries, code) },
            })),
        [update],
    );

    return (
        <div className="space-y-6">
            <OptionCard
                className="ob-rise"
                style={riseStyle(0)}
                value="worldwide"
                selected={worldwide}
                onSelect={toggleWorldwide}
                icon={GLOBE_ICON}
                title="Anywhere in the world"
                description="Remote jobs only, from employers anywhere. Choose this if you are not tied to a MENA country."
            />

            <div className="ob-rise flex items-center gap-3 text-xs text-fg-tertiary" style={riseStyle(1)}>
                <span className="h-px flex-1 bg-border-subtle" />
                or pick MENA countries
                <span className="h-px flex-1 bg-border-subtle" />
            </div>

            <div>
                <div className="ob-rise relative mb-3" style={riseStyle(2)}>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-quaternary" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search countries"
                        aria-label="Search countries"
                        className="pl-9"
                    />
                </div>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="MENA countries">
                    {shown.map((country, i) => (
                        <CountryOption
                            key={country.code}
                            code={country.code}
                            name={country.name}
                            selected={!worldwide && selected.includes(country.code)}
                            onToggle={toggleCountry}
                            style={riseStyle(i + 3)}
                        />
                    ))}
                </ul>
                {shown.length === 0 && <p className="text-sm text-fg-tertiary">No MENA country matches “{search}”.</p>}
            </div>
        </div>
    );
}

const WORK_MODE_COPY: Record<WorkMode, { description: string; icon: React.ReactNode }> = {
    remote: { description: "Work from home or anywhere in your country.", icon: <Laptop className="size-5" /> },
    hybrid: { description: "Some days in the office, some at home.", icon: <ArrowLeftRight className="size-5" /> },
    "on-site": { description: "At the employer's office every day.", icon: <Building2 className="size-5" /> },
};

function WorkModeScreen({ draft, update }: StepScreenProps) {
    const toggleMode = useCallback(
        (mode: WorkMode) => update((d) => ({ workModes: toggle(d.workModes, mode) })),
        [update],
    );

    return (
        <div className="grid gap-3 sm:grid-cols-3">
            {WORK_MODES.map((mode, i) => (
                <OptionCard
                    key={mode}
                    className="ob-rise"
                    style={riseStyle(i)}
                    layout="stack"
                    value={mode}
                    selected={draft.workModes.includes(mode)}
                    onSelect={toggleMode}
                    icon={WORK_MODE_COPY[mode].icon}
                    title={WORK_MODE_LABEL[mode]}
                    description={WORK_MODE_COPY[mode].description}
                />
            ))}
        </div>
    );
}

function TitlesScreen({ draft, update, catalogue }: StepScreenProps) {
    const suggestions = useMemo(
        () => (draft.field ? titlesForField(catalogue, draft.field) : []),
        [catalogue, draft.field],
    );

    return (
        <div className="space-y-8">
            {catalogue.length > 0 && (
                <div className="ob-rise" style={riseStyle(0)}>
                    <label htmlFor="onboarding-field" className="text-sm font-medium text-fg-secondary">
                        Your field
                    </label>
                    <p className="mt-0.5 text-[13px] text-fg-tertiary">Optional. Shows common titles to pick from.</p>
                    <select
                        id="onboarding-field"
                        value={draft.field ?? ""}
                        onChange={(event) => update({ field: event.target.value || null })}
                        className="mt-2.5 h-9.5 w-full rounded-control border border-border-standard bg-bg-panel px-3 text-sm text-fg-primary focus:border-accent/45 focus:outline-none sm:max-w-sm"
                    >
                        <option value="">Choose a field</option>
                        {catalogue.map((field) => (
                            <option key={field.value} value={field.value}>
                                {field.label}
                            </option>
                        ))}
                    </select>

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

            <div className="ob-rise" style={riseStyle(1)}>
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

/** Which screen draws which step. The order and the rules are the State objects' job, not this map's. */
export const STEP_SCREENS: Record<StepId, (props: StepScreenProps) => React.ReactNode> = {
    location: LocationScreen,
    workMode: WorkModeScreen,
    titles: TitlesScreen,
    details: DetailsScreen,
    review: ReviewScreen,
};
