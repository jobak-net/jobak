import { actorById } from "../config/actors";
import { coversCountry, type SearchInput } from "../types/catalogue";
import { siteEstimate } from "./results";
import type { SitePlan } from "./run-collection";

const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

/**
 * What a search will run: the given sites that are still in the catalogue
 * and cover the search's country, each with the estimate the user is shown
 * (live price where known, else the stored one). Every run starts from a plan,
 * so no run starts uncovered or unpriced.
 */
export function planSites(
    siteIds: readonly string[],
    search: SearchInput,
    livePrices: Record<string, { perJobUsd: number; startUsd: number } | undefined>,
): SitePlan[] {
    return siteIds.flatMap((id) => {
        const entry = actorById(id);
        if (!entry || !coversCountry(entry, search.country)) return [];
        const price = livePrices[id] ?? entry.fallbackPrice;
        return [{ entry, estimateUsd: siteEstimate(price, search.jobsPerSite, entry.pageSize, entry.fallbackPrice) }];
    });
}

export function totalEstimate(plans: readonly SitePlan[]): number {
    return round4(plans.reduce((sum, plan) => sum + plan.estimateUsd, 0));
}
