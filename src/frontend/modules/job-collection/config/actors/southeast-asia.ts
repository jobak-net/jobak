import type { SearchInput } from "../../types/catalogue";
import { defineActor } from "./define";

const SEEK: Record<string, string> = {
    AU: "australia",
    NZ: "new zealand",
    HK: "hongkong",
    ID: "indonesia",
    MY: "malaysia",
    PH: "philippines",
    SG: "singapore",
    TH: "thailand",
};

/** JobStreet and JobsDB come from the same publisher and take the same input. */
function seekAsiaInput(search: SearchInput) {
    return {
        query: search.title,
        country: search.country,
        ...(search.city.trim() ? { location: search.city.trim() } : {}),
        maxResults: search.jobsPerSite,
        requireContact: "off",
        includeDetails: false,
        includeApplicantInsights: false,
        includeRunSummary: false,
        compact: false,
        incrementalMode: false,
    };
}

/** Southeast Asia and the Pacific. */
export const SOUTHEAST_ASIA_ACTORS = [
    defineActor({
        id: "seek",
        site: "Seek",
        actorId: "websift/seek-job-scraper",
        category: "southeast-asia",
        description: "Australia and New Zealand's largest job board, plus its Asian sites.",
        covers: Object.keys(SEEK),
        fallbackPrice: { perJobUsd: 0.003, startUsd: 0 },
        buildInput: (search) => ({
            searchTerm: search.title,
            country: SEEK[search.country],
            ...(search.city.trim() ? { location: search.city.trim() } : {}),
            maxResults: search.jobsPerSite,
        }),
        paths: { company: ["advertiser.name"], location: ["joblocationInfo.displayLocation"] },
    }),
    defineActor({
        id: "jobstreet",
        site: "JobStreet",
        actorId: "blackfalcondata/jobstreet-scraper",
        category: "southeast-asia",
        description: "Jobs in Malaysia, Singapore, Indonesia and the Philippines.",
        covers: ["MY", "SG", "ID", "PH"],
        fallbackPrice: { perJobUsd: 0.002, startUsd: 0.01 },
        buildInput: seekAsiaInput,
    }),
    defineActor({
        id: "jobsdb",
        site: "JobsDB",
        actorId: "blackfalcondata/jobsdb-scraper",
        category: "southeast-asia",
        description: "Jobs in Hong Kong and Thailand.",
        covers: ["HK", "TH"],
        fallbackPrice: { perJobUsd: 0.001, startUsd: 0.01 },
        buildInput: seekAsiaInput,
    }),
    defineActor({
        id: "mycareersfuture",
        site: "MyCareersFuture",
        actorId: "automation-lab/mycareersfuture-singapore-jobs-scraper",
        category: "southeast-asia",
        description: "Singapore's government job portal.",
        covers: ["SG"],
        fallbackPrice: { perJobUsd: 0.0001, startUsd: 0.005 },
        buildInput: (search) => ({
            searchQuery: search.title,
            maxItems: search.jobsPerSite,
            includeDescriptionHtml: false,
        }),
    }),
];
