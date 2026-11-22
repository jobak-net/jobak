import type { PublicJob, PublicJobCard, RegionFilter, WorkplaceFilter } from "@/shared/contracts/job-board";

/** What the board is narrowed by, already resolved (no defaults left to apply). */
export interface JobBoardFilters {
    region: RegionFilter;
    workplace: WorkplaceFilter;
    /** Trimmed and cut to the board's limit; empty means no search. */
    search: string;
    /** Title keywords of the chosen category; empty means every category. */
    categoryKeywords: readonly string[];
}

/**
 * The public job pool. A port, so the use cases never name a table.
 *
 * Only ever the jobs a visitor may see — active, relevant, with a public slug
 * — and never anything per-user.
 */
export interface JobBoardRepository {
    /** One page of cards, newest to Jobak first, and how many match in all. */
    list(filters: JobBoardFilters, page: { limit: number; offset: number }): Promise<{ jobs: PublicJobCard[]; total: number }>;

    /** One job by its public slug, or null. Its description is as stored — not yet sanitised. */
    findBySlug(slug: string): Promise<PublicJob | null>;
}
