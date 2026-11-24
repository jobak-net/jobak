import { ACTORS } from "../config/actors";
import { CATEGORIES } from "../config/categories";
import { coversCountry, type ActorEntry, type CategoryId } from "../types/catalogue";

export interface SiteGroup {
    category: { id: CategoryId; label: string };
    sites: ActorEntry[];
}

/** What a first visit picks: LinkedIn, Indeed and the Middle East boards, each only if it covers the country. */
export function defaultSites(country: string): string[] {
    return ACTORS.filter(
        (entry) => (entry.id === "linkedin" || entry.id === "indeed" || entry.category === "mena") && coversCountry(entry, country),
    ).map((entry) => entry.id);
}

/**
 * The catalogue as the picker shows it: by category, the sites that can
 * search `country` first, the rest under "Other regions". `filter` narrows by
 * site name. Empty groups are left out.
 */
export function groupSites(country: string, filter: string): { covered: SiteGroup[]; other: SiteGroup[] } {
    const needle = filter.trim().toLowerCase();
    const covered: SiteGroup[] = [];
    const other: SiteGroup[] = [];
    for (const category of CATEGORIES) {
        const sites = ACTORS.filter((entry) => entry.category === category.id && entry.site.toLowerCase().includes(needle));
        const yes = sites.filter((entry) => coversCountry(entry, country));
        const no = sites.filter((entry) => !coversCountry(entry, country));
        if (yes.length) covered.push({ category, sites: yes });
        if (no.length) other.push({ category, sites: no });
    }
    return { covered, other };
}
