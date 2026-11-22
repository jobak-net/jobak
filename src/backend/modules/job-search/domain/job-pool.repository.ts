/** How the database narrows the pool before titles are matched in memory. */
export interface PoolFilter {
    /** `jobs.job_type` values to keep; empty keeps every arrangement. */
    workplaces: string[];
    /**
     * ISO country codes; empty means anywhere. Jobs with no known region stay
     * in — remote-first boards mostly — since a country search still wants them.
     */
    countries: string[];
    /** How many of the newest to consider. */
    limit: number;
}

/** A job from the shared pool, as the dashboard needs it. */
export interface PoolJob {
    id: string;
    title: string;
    company: string;
    location: string | null;
    /** `jobs.job_type`: the workplace arrangement (remote / onsite / hybrid). */
    jobType: string | null;
    /** As stored — not yet sanitised. */
    description: string | null;
    techStack: string[];
    salary: string | null;
    applyUrl: string;
    /** ISO: when the board posted it, or else when it was collected. */
    postedAt: string | null;
    /** The source's display name, or null when its row is missing. */
    source: string | null;
}

/** What the matcher knows about one job for one user. */
export interface UserMatch {
    jobId: string;
    /** null: nothing has scored it yet — distinct from a score of 0. */
    score: number | null;
    bookmarked: boolean;
    reason: string | null;
    /** The model's read of the stack; empty when it gave none. */
    techStack: string[];
}

/**
 * The shared job pool and a user's matches on it. A port, so the use case
 * never names a table and can be exercised without Postgres.
 */
export interface JobPoolRepository {
    /** Active jobs, newest posting first, narrowed by `filter`. */
    pool(filter: PoolFilter): Promise<PoolJob[]>;

    /** Every match row the user has: scores, bookmarks, reasons. */
    matches(userId: string): Promise<UserMatch[]>;
}
