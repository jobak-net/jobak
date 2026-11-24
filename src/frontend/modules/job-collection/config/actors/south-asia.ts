import { defineActor } from "./define";

const city = (value: string) => (value.trim() ? { location: value.trim() } : {});

/** South Asia. */
export const SOUTH_ASIA_ACTORS = [
    defineActor({
        id: "naukri",
        site: "Naukri",
        actorId: "valig/naukri-jobs-scraper",
        category: "south-asia",
        description: "India's largest job board.",
        covers: ["IN"],
        fallbackPrice: { perJobUsd: 0.0004, startUsd: 0.001 },
        buildInput: (search) => ({
            keywords: search.title,
            ...city(search.city),
            limit: search.jobsPerSite,
        }),
    }),
    defineActor({
        id: "internshala",
        site: "Internshala",
        actorId: "blackfalcondata/internshala-scraper",
        category: "south-asia",
        description: "Internships in India, in offices and from home.",
        covers: ["IN"],
        fallbackPrice: { perJobUsd: 0.0004, startUsd: 0.0005 },
        buildInput: (search) => ({
            listingType: "internship",
            query: search.title,
            country: "IN",
            ...city(search.city),
            maxResults: search.jobsPerSite,
            includeDetails: false,
            compact: false,
            incrementalMode: false,
        }),
    }),
    defineActor({
        id: "rozee",
        site: "Rozee.pk",
        actorId: "memo23/rozee-scraper",
        category: "south-asia",
        description: "Pakistan's largest job board.",
        covers: ["PK"],
        fallbackPrice: { perJobUsd: 0.001, startUsd: 0.005 },
        buildInput: (search) => ({
            searchQueries: [search.title],
            locations: search.city.trim() ? [search.city.trim()] : [],
            maxItemsPerQuery: search.jobsPerSite,
            scrapeJobDetails: false,
            enrichEmails: false,
        }),
    }),
];
