import { defineActor } from "./define";

/** Freelance projects. Online projects are open from anywhere, so these cover every country. */
export const FREELANCE_ACTORS = [
    defineActor({
        id: "upwork",
        site: "Upwork",
        actorId: "blackfalcondata/upwork-scraper",
        category: "freelance",
        description: "The biggest freelance marketplace: hourly and fixed-price projects.",
        covers: "any",
        fallbackPrice: { perJobUsd: 0.001, startUsd: 0.001 },
        buildInput: (search) => ({
            query: search.title,
            maxResults: search.jobsPerSite,
            enrichDetails: false,
            compact: false,
            incrementalMode: false,
            includeRunMetadata: false,
        }),
    }),
    defineActor({
        id: "freelancer",
        site: "Freelancer.com",
        actorId: "shahidirfan/freelancer-com-scraper",
        category: "freelance",
        description: "Projects posted for bidding on Freelancer.com.",
        covers: "any",
        fallbackPrice: { perJobUsd: 0.001, startUsd: 0.0005 },
        buildInput: (search) => ({
            keyword: search.title,
            jobType: "all",
            results_wanted: search.jobsPerSite,
        }),
        paths: { title: ["project_name"], salary: ["budget_range"] },
    }),
    defineActor({
        id: "peopleperhour",
        site: "PeoplePerHour",
        actorId: "memo23/peopleperhour-job-scraper",
        category: "freelance",
        description: "Freelance projects, mostly from UK and European clients.",
        covers: "any",
        fallbackPrice: { perJobUsd: 0.001, startUsd: 0.005 },
        buildInput: (search) => ({
            searchQueries: [search.title],
            maxItems: search.jobsPerSite,
            includeDescription: false,
            onlyUniqueProjects: true,
        }),
    }),
];
