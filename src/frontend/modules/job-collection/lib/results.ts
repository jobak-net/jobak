import type { CollectedJob } from "../types/catalogue";
import type { ActorPrice } from "./apify-client";

const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

/**
 * What one site's run costs at most: its start fee plus every job it may
 * charge for. Actors that page charge for whole pages, so their job count
 * rounds up to `pageSize`. A missing per-job price uses `fallback`.
 */
export function siteEstimate(
    price: ActorPrice,
    jobsPerSite: number,
    pageSize?: number,
    fallback?: { perJobUsd: number; startUsd: number },
): number {
    const jobs = pageSize ? Math.ceil(jobsPerSite / pageSize) * pageSize : jobsPerSite;
    const perJob = price.perJobUsd ?? fallback?.perJobUsd ?? 0;
    return round4(price.startUsd + jobs * perJob);
}

/**
 * The run's `maxTotalChargeUsd`: the estimate plus 10%. Many actors keep
 * charging past `maxItems` until this cap, so it is the real limit.
 */
export function runCap(estimate: number): number {
    return round4(estimate * 1.1);
}

const TRACKING = /^(utm_.*|refid|trackingid|ref|src|source|position|pagenum)$/i;

/** One listing's identity across sites: host lowercased, tracking params, hash and trailing slash dropped. */
function urlKey(url: string): string {
    try {
        const parsed = new URL(url);
        for (const key of [...parsed.searchParams.keys()]) if (TRACKING.test(key)) parsed.searchParams.delete(key);
        parsed.hash = "";
        const path = parsed.pathname.replace(/\/+$/, "");
        return `${parsed.host.toLowerCase()}${path}${parsed.search}`;
    } catch {
        return url;
    }
}

const textKey = (value: string | null) => (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

function timeOf(job: CollectedJob): number | null {
    if (!job.postedAt || !/^\d{4}-\d{2}-\d{2}T/.test(job.postedAt)) return null;
    const time = Date.parse(job.postedAt);
    return Number.isNaN(time) ? null : time;
}

/**
 * Jobs from every site as one list, newest first, undated last. The same
 * listing found twice is kept once, first seen wins:
 * - the same link, from any site;
 * - the same title, company and place found on two different sites (a
 *   company posting one job on several boards). Within one site, matching
 *   postings stay separate: the site lists them apart for a reason.
 */
export function mergeJobs(batches: CollectedJob[][]): CollectedJob[] {
    const seenUrls = new Set<string>();
    /** Title + company + place → the site that listed it first. */
    const seenText = new Map<string, string>();
    const merged: CollectedJob[] = [];
    for (const job of batches.flat()) {
        const byUrl = urlKey(job.url);
        const byText = job.company ? `${textKey(job.title)}@${textKey(job.company)}@${textKey(job.location)}` : null;
        const textSite = byText ? seenText.get(byText) : undefined;
        if (seenUrls.has(byUrl) || (textSite !== undefined && textSite !== job.site)) continue;
        seenUrls.add(byUrl);
        if (byText && textSite === undefined) seenText.set(byText, job.site);
        merged.push(job);
    }
    return merged
        .map((job, index) => ({ job, index, time: timeOf(job) }))
        .sort((a, b) => {
            if (a.time !== null && b.time !== null) return b.time - a.time || a.index - b.index;
            if (a.time !== null) return -1;
            if (b.time !== null) return 1;
            return a.index - b.index;
        })
        .map(({ job }) => job);
}

/** One CSV cell: RFC 4180 quoting, and a leading = + - @ defused so spreadsheets don't run it as a formula. */
function cell(value: string | null): string {
    let text = value ?? "";
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(jobs: CollectedJob[]): string {
    const rows = [["Title", "Company", "Location", "Posted", "Salary", "Site", "Link"].join(",")];
    for (const job of jobs) {
        rows.push([job.title, job.company, job.location, job.postedAt, job.salary, job.site, job.url].map(cell).join(","));
    }
    return rows.join("\r\n");
}
