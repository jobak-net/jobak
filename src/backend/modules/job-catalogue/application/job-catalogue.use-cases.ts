import {
    MAX_SEARCH_RESULTS,
    SUGGESTIONS_PER_FIELD,
    parseTitleQuery,
    type JobField,
    type JobTitleMatch,
} from "../domain/job-catalogue";
import type { JobCatalogueRepository } from "../domain/job-catalogue.repository";

/**
 * The fields, each with a few suggested titles — what the onboarding page
 * ships with. Not every title: at ~7,700 that would be hundreds of KB of page
 * props, so the rest is reached through search.
 *
 * Reference data that changes with a migration, not with use, so it is cached
 * for the process. A failed refresh serves the last good copy: a stale
 * dropdown is a far smaller problem than an empty one.
 */
export class ListFieldsUseCase {
    private cached: { at: number; fields: JobField[] } | null = null;
    private static readonly TTL_MS = 5 * 60_000;

    constructor(private readonly catalogue: JobCatalogueRepository) {}

    async execute(): Promise<JobField[]> {
        if (this.cached && Date.now() - this.cached.at < ListFieldsUseCase.TTL_MS) return this.cached.fields;
        try {
            const fields = await this.catalogue.listFields(SUGGESTIONS_PER_FIELD);
            this.cached = { at: Date.now(), fields };
            return fields;
        } catch (error) {
            if (this.cached) return this.cached.fields;
            throw error;
        }
    }
}

/** Type-ahead search. Too short or empty a query returns nothing rather than a third of the catalogue. */
export class SearchTitlesUseCase {
    constructor(private readonly catalogue: JobCatalogueRepository) {}

    async execute(raw: string, field?: string | null): Promise<JobTitleMatch[]> {
        const words = parseTitleQuery(raw);
        if (!words) return [];
        return this.catalogue.search(words, { field, limit: MAX_SEARCH_RESULTS });
    }
}

export type ResolveResult = { ok: true; titles: string[] } | { ok: false; unknown: string[] };

/**
 * Checks titles against the catalogue and returns its spelling of each.
 *
 * The rule that onboarding accepts catalogue titles only is enforced here, on
 * the server — the form offering only catalogue titles is a convenience, not
 * a guarantee, because the request can be edited.
 */
export class ResolveTitlesUseCase {
    constructor(private readonly catalogue: JobCatalogueRepository) {}

    async execute(titles: string[]): Promise<ResolveResult> {
        const canonical = await this.catalogue.resolve(titles);
        const unknown = titles.filter((t) => !canonical.has(t.toLowerCase()));
        if (unknown.length > 0) return { ok: false, unknown };
        // De-duplicate after canonicalising: "nurse" and "Nurse" are one title.
        return { ok: true, titles: [...new Set(titles.map((t) => canonical.get(t.toLowerCase())!))] };
    }
}
