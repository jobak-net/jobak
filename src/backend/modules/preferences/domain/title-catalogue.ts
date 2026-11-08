/**
 * What preferences needs from the job title catalogue: is each title in it,
 * and how does the catalogue spell it.
 *
 * A port owned by this module rather than an import of the catalogue module,
 * so preferences does not depend on how or where the catalogue is stored —
 * the composition root plugs the real one in.
 */
export interface TitleCatalogue {
    resolve(titles: string[]): Promise<{ ok: true; titles: string[] } | { ok: false; unknown: string[] }>;
}

/** The message shown on the titles step when some titles are not in the catalogue. */
export function unknownTitlesMessage(unknown: string[]): string {
    if (unknown.length === 1) {
        return `“${unknown[0]}” isn't in our job title list. Remove it and pick a title from the search.`;
    }
    const shown = unknown.slice(0, 3).map((t) => `“${t}”`).join(", ");
    const more = unknown.length > 3 ? ` and ${unknown.length - 3} more` : "";
    return `${shown}${more} aren't in our job title list. Remove them and pick titles from the search.`;
}
