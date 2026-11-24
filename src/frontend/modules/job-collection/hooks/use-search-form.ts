"use client";

import { useState } from "react";

import { actorById } from "../config/actors";
import { readSites, saveSites } from "../lib/history";
import { defaultSites } from "../lib/site-selection";
import { coversCountry, type JobsPerSite, type SearchInput } from "../types/catalogue";

/**
 * The search being set up: title, country, city, jobs per site, and the
 * sites picked. The first visit preselects for the country; after a search,
 * the picked sites are remembered on this device.
 */
export function useSearchForm(accountId: string, initialCountry: string) {
    const [title, setTitle] = useState("");
    const [country, setCountryValue] = useState(initialCountry);
    const [city, setCity] = useState("");
    const [jobsPerSite, setJobsPerSite] = useState<JobsPerSite>(25);
    const [filter, setFilter] = useState("");
    const [remembered] = useState(() => readSites(accountId));
    const [picked, setPicked] = useState<string[]>(() => remembered ?? defaultSites(initialCountry));
    const [customised, setCustomised] = useState(remembered !== null);

    /** A new country re-picks the defaults, unless the user has chosen sites themselves. */
    function setCountry(code: string) {
        setCountryValue(code);
        if (!customised) setPicked(defaultSites(code));
    }

    function toggle(site: string) {
        setCustomised(true);
        setPicked((current) => (current.includes(site) ? current.filter((id) => id !== site) : [...current, site]));
    }

    /** Picked sites that can search the chosen country: the ones a search will run. */
    const runnable = picked.filter((id) => {
        const entry = actorById(id);
        return entry !== undefined && coversCountry(entry, country);
    });

    const search: SearchInput = { title: title.trim(), country, city: city.trim(), jobsPerSite };
    const canRun = search.title.length >= 2 && country !== "" && runnable.length > 0;

    return {
        title,
        setTitle,
        country,
        setCountry,
        city,
        setCity,
        jobsPerSite,
        setJobsPerSite,
        filter,
        setFilter,
        picked,
        toggle,
        runnable,
        search,
        canRun,
        rememberSites: () => saveSites(accountId, picked),
    };
}
