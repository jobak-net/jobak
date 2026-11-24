import { countryLabel } from "../country-codes";
import { defineActor } from "./define";

const GULF = ["AE", "SA", "QA", "KW", "BH", "OM"] as const;

/** Egypt & the Middle East. */
export const MENA_ACTORS = [
    defineActor({
        id: "wuzzuf",
        site: "Wuzzuf",
        actorId: "blackfalcondata/wuzzuf-scraper",
        category: "mena",
        description: "Egypt's biggest job board, plus Saudi Arabia, the Gulf, Jordan and Lebanon.",
        covers: ["EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO", "LB"],
        fallbackPrice: { perJobUsd: 0.001, startUsd: 0.005 },
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
        id: "bayt",
        site: "Bayt",
        actorId: "blackfalcondata/bayt-scraper",
        category: "mena",
        description: "The Middle East's largest job board: the Gulf, Egypt, the Levant, North Africa and South Asia.",
        covers: ["AE", "SA", "EG", "KW", "QA", "BH", "JO", "LB", "PK", "IN", "OM", "IQ", "MA"],
        fallbackPrice: { perJobUsd: 0.002, startUsd: 0.0005 },
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
        id: "naukrigulf",
        site: "Naukrigulf",
        actorId: "blackfalcondata/naukrigulf-scraper",
        category: "mena",
        description: "A Gulf job board: the UAE, Saudi Arabia, Qatar, Kuwait, Bahrain and Oman.",
        covers: GULF,
        fallbackPrice: { perJobUsd: 0.001, startUsd: 0.005 },
        buildInput: (search) => ({
            mode: "search",
            query: search.title,
            location: search.city.trim() || countryLabel(search.country),
            maxResults: search.jobsPerSite,
            includeDetails: false,
            compact: false,
            incrementalMode: false,
        }),
    }),
    defineActor({
        id: "gulftalent",
        site: "GulfTalent",
        actorId: "blackfalcondata/gulftalent-scraper",
        category: "mena",
        description: "Professional jobs across the six Gulf countries.",
        covers: GULF,
        fallbackPrice: { perJobUsd: 0.0007, startUsd: 0.005 },
        buildInput: (search) => ({
            query: search.title,
            country: search.country,
            ...(search.city.trim() ? { location: search.city.trim() } : {}),
            maxResults: search.jobsPerSite,
            includeDetails: false,
            includeCompanyProfile: false,
            compact: false,
            incrementalMode: false,
        }),
    }),
];
