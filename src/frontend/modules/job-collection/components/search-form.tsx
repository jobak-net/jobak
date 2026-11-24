"use client";

import { useId, useMemo } from "react";

import { Field, Input, inputClass } from "@/frontend/shared/ui";
import { cn } from "@/frontend/shared/lib";

import { COUNTRY_CODES, countryLabel } from "../config/country-codes";
import { JOBS_PER_SITE, type JobsPerSite } from "../types/catalogue";

/** The search itself: job title, country, optional city, and how many jobs to take from each site. */
export function SearchForm({
    title,
    onTitleChange,
    country,
    onCountryChange,
    city,
    onCityChange,
    jobsPerSite,
    onJobsPerSiteChange,
    disabled,
}: {
    title: string;
    onTitleChange: (value: string) => void;
    country: string;
    onCountryChange: (value: string) => void;
    city: string;
    onCityChange: (value: string) => void;
    jobsPerSite: JobsPerSite;
    onJobsPerSiteChange: (value: JobsPerSite) => void;
    disabled: boolean;
}) {
    const id = useId();
    const countries = useMemo(
        () => COUNTRY_CODES.map((code) => ({ code, name: countryLabel(code) })).sort((a, b) => a.name.localeCompare(b.name)),
        [],
    );

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)]">
            <Field label="Job title" htmlFor={`${id}-title`} controlAtBottom>
                <Input
                    id={`${id}-title`}
                    value={title}
                    onChange={(event) => onTitleChange(event.target.value)}
                    placeholder="Back End Developer"
                    maxLength={120}
                    disabled={disabled}
                />
            </Field>
            <Field label="Country" htmlFor={`${id}-country`} controlAtBottom>
                <select
                    id={`${id}-country`}
                    value={country}
                    onChange={(event) => onCountryChange(event.target.value)}
                    disabled={disabled}
                    className={cn(inputClass, "appearance-auto")}
                >
                    <option value="">Pick a country</option>
                    {countries.map(({ code, name }) => (
                        <option key={code} value={code}>
                            {name}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="City (optional)" htmlFor={`${id}-city`} controlAtBottom>
                <Input
                    id={`${id}-city`}
                    value={city}
                    onChange={(event) => onCityChange(event.target.value)}
                    placeholder="Cairo"
                    maxLength={80}
                    disabled={disabled}
                />
            </Field>
            <Field label="Jobs per site" htmlFor={`${id}-count`} controlAtBottom>
                <select
                    id={`${id}-count`}
                    value={jobsPerSite}
                    onChange={(event) => onJobsPerSiteChange(Number(event.target.value) as JobsPerSite)}
                    disabled={disabled}
                    className={cn(inputClass, "appearance-auto")}
                >
                    {JOBS_PER_SITE.map((count) => (
                        <option key={count} value={count}>
                            {count}
                        </option>
                    ))}
                </select>
            </Field>
        </div>
    );
}
