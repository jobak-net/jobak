import { defineActor, placeText } from "./define";

/** Company career sites: jobs straight from employers' hiring systems. */
export const CAREER_SITE_ACTORS = [
    defineActor({
        id: "career-sites",
        site: "Company career sites",
        actorId: "jobo.world/ats-jobs-api",
        category: "career-sites",
        description: "Live jobs from employers' own career sites, across 200+ hiring systems (Greenhouse, Lever, Workday…).",
        covers: "any",
        fallbackPrice: { perJobUsd: 0.004, startUsd: 0 },
        buildInput: (search) => ({
            queries: [search.title],
            locations: [placeText(search)],
            page: 1,
            page_size: search.jobsPerSite,
            include_company_details: false,
        }),
    }),
];
