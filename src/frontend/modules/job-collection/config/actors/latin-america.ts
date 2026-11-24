import { defineActor } from "./define";

const COMPUTRABAJO = ["MX", "CO", "PE", "AR", "CL", "EC", "VE", "CR", "GT", "SV", "UY", "PY", "PA", "HN", "NI", "DO", "BO", "CU", "PR"];

/** Latin America. */
export const LATIN_AMERICA_ACTORS = [
    defineActor({
        id: "computrabajo",
        site: "Computrabajo",
        actorId: "santamaria-automations/computrabajo-scraper",
        category: "latin-america",
        description: "The largest job board across Spanish-speaking Latin America.",
        covers: COMPUTRABAJO,
        fallbackPrice: { perJobUsd: 0.003, startUsd: 0.001 },
        buildInput: (search) => ({
            country: search.country.toLowerCase(),
            searchUrls: [],
            searchQueries: [search.city.trim() ? `${search.title} ${search.city.trim()}` : search.title],
            maxResultsPerQuery: search.jobsPerSite,
            maxResults: search.jobsPerSite,
            includeJobDetails: false,
        }),
    }),
    defineActor({
        id: "bumeran",
        site: "Bumeran",
        actorId: "blackfalcondata/bumeran-scraper",
        category: "latin-america",
        description: "Jobs in Argentina, Peru, Mexico, Chile, Ecuador, Panama and Venezuela.",
        covers: ["AR", "PE", "MX", "VE", "CL", "EC", "PA"],
        fallbackPrice: { perJobUsd: 0.001, startUsd: 0.0005 },
        buildInput: (search) => ({
            query: search.title,
            country: search.country,
            ...(search.city.trim() ? { location: search.city.trim() } : {}),
            maxResults: search.jobsPerSite,
            includeDetails: false,
            compact: false,
            incrementalMode: false,
        }),
    }),
    defineActor({
        id: "occ-mundial",
        site: "OCC Mundial",
        actorId: "corvuslab/occ-mundial-jobs-scraper",
        category: "latin-america",
        description: "Mexico's largest job board.",
        covers: ["MX"],
        fallbackPrice: { perJobUsd: 0.001, startUsd: 0.0005 },
        buildInput: (search) => ({
            query: search.title,
            location: search.city.trim(),
            maxResults: search.jobsPerSite,
            compact: false,
            incrementalMode: false,
        }),
    }),
];
