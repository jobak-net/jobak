/** The shapes the job-collection catalogue and page share. */

export type CategoryId =
    | "mena"
    | "worldwide"
    | "remote"
    | "freelance"
    | "career-sites"
    | "south-asia"
    | "southeast-asia"
    | "europe"
    | "latin-america";

export const JOBS_PER_SITE = [10, 25, 50, 100] as const;
export type JobsPerSite = (typeof JOBS_PER_SITE)[number];

/** One search, run on every picked site. */
export interface SearchInput {
    title: string;
    /** ISO 3166-1 alpha-2. */
    country: string;
    /** Optional; "" for the whole country. */
    city: string;
    jobsPerSite: JobsPerSite;
}

/** One job as the page shows it, whichever site it came from. */
export interface CollectedJob {
    /** The catalogue entry's id. */
    site: string;
    title: string;
    company: string | null;
    location: string | null;
    /** The original listing, always absolute http(s). */
    url: string;
    postedAt: string | null;
    salary: string | null;
}

/**
 * One Apify actor in the catalogue. `buildInput` turns a search into the
 * actor's own input, and is only called for a country it `covers`.
 * `readJob` turns one dataset item into a job, or null to drop it.
 */
export interface ActorEntry {
    id: string;
    site: string;
    /** `user/name` on the Apify store. */
    actorId: string;
    category: CategoryId;
    /** One line: what it covers. */
    description: string;
    storeUrl: string;
    /** ISO codes the actor can search, or "any" for a free-text location. */
    covers: "any" | readonly string[];
    /** The store's free-plan price on 2026-11-24, used when the live price can't be read. */
    fallbackPrice: { perJobUsd: number; startUsd: number };
    /**
     * For actors that count pages, not jobs: the input asks for
     * ceil(jobsPerSite / pageSize) pages, and the run's `maxItems` caps what
     * is charged at exactly jobsPerSite.
     */
    pageSize?: number;
    buildInput(search: SearchInput): Record<string, unknown>;
    readJob(item: unknown): Omit<CollectedJob, "site"> | null;
}

export function coversCountry(entry: ActorEntry, code: string): boolean {
    return entry.covers === "any" || entry.covers.includes(code);
}
