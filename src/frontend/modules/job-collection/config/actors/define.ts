import { firstText, isoDate, safeUrl } from "../../lib/read-fields";
import type { ActorEntry, CollectedJob, SearchInput } from "../../types/catalogue";
import { countryLabel } from "../country-codes";

/** Where each value usually sits in job actors' output, most common first. */
export interface JobPaths {
    title: string[];
    company: string[];
    location: string[];
    url: string[];
    postedAt: string[];
    salary: string[];
}

export const COMMON_PATHS: JobPaths = {
    title: ["title", "jobTitle", "positionName", "position", "job_title", "name"],
    company: ["companyName", "company.name", "company", "employer.name", "employer", "hiringOrganization.name", "company_name", "organization"],
    location: [
        "location",
        "jobLocation",
        "formattedLocation",
        "location.name",
        "location.city",
        "city",
        "job_location",
        "place",
        "locations.0.location",
        "locations.0.city",
        "locations.0.label",
        "locations.0",
    ],
    url: ["url", "jobUrl", "link", "jobLink", "job_url", "detailUrl", "sourceUrl", "source_url", "portalUrl", "canonicalUrl", "externalUrl", "applyUrl", "apply_url", "externalApplyLink"],
    postedAt: ["postedAt", "posted_at", "postedDate", "publishedDate", "datePosted", "datePublished", "date_posted", "publishedAt", "postingDate", "listedAt", "postedTime", "date", "createdAt"],
    salary: ["salary", "salaryText", "salaryRange", "salary.text", "compensation", "salary_text", "salaryInfo"],
};

/** A job read with `paths` (each falling back to the common ones). Null without a title or an http(s) link. */
export function readJobWith(item: unknown, paths: Partial<JobPaths> = {}): Omit<CollectedJob, "site"> | null {
    const pick = (key: keyof JobPaths) => [...(paths[key] ?? []), ...COMMON_PATHS[key]];
    const title = firstText(item, pick("title"));
    const url = safeUrl(firstText(item, pick("url")));
    if (!title || !url) return null;
    const posted = pick("postedAt")
        .map((path) => firstText(item, [path]))
        .find((value) => value !== null);
    return {
        title,
        company: firstText(item, pick("company")),
        location: firstText(item, pick("location")),
        url,
        postedAt: posted ? isoDate(/^\d+$/.test(posted) ? Number(posted) : posted) : null,
        salary: notApplicable(firstText(item, pick("salary"))),
    };
}

/** Boards that write "N/A" or "-" for no salary. */
function notApplicable(value: string | null): string | null {
    return value && /^(n\/?a|-+|none|not disclosed)$/i.test(value) ? null : value;
}

/** "Cairo, Egypt", or "Egypt" without a city: for actors that take a free-text location. */
export function placeText(search: SearchInput): string {
    const country = countryLabel(search.country);
    return search.city.trim() ? `${search.city.trim()}, ${country}` : country;
}

/** Codes from an actor's enum (any case, "uk" meaning GB), kept only where we know the country. */
export function isoCodes(values: readonly string[]): string[] {
    return [...new Set(values.map((value) => (value.toLowerCase() === "uk" ? "GB" : value.toUpperCase())))];
}

type Definition = Omit<ActorEntry, "storeUrl" | "readJob"> & {
    readJob?: ActorEntry["readJob"];
    paths?: Partial<JobPaths>;
};

/** An entry with the store link filled in and, unless it has its own, the common job reader. */
export function defineActor({ paths, readJob, ...definition }: Definition): ActorEntry {
    return {
        ...definition,
        storeUrl: `https://apify.com/${definition.actorId}`,
        readJob: readJob ?? ((item) => readJobWith(item, paths)),
    };
}
