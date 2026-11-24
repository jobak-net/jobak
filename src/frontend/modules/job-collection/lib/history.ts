import { actorById } from "../config/actors";
import { JOBS_PER_SITE, type SearchInput } from "../types/catalogue";
import { browserStorage } from "./token-store";

/**
 * What the page remembers on this device, per account: the last searches
 * (with their run ids, so a search can be reopened or resumed) and the sites
 * last picked. The results themselves stay on Apify. Storage failures read
 * as empty.
 */

export interface HistoryEntry {
    id: string;
    search: SearchInput;
    runs: { site: string; runId: string }[];
    startedAt: string;
}

const MAX_ENTRIES = 5;
const historyKey = (accountId: string) => `jobak.job-collection.history.${accountId}`;
const sitesKey = (accountId: string) => `jobak.job-collection.sites.${accountId}`;

function readJson(storage: Storage | undefined, key: string): unknown {
    try {
        const raw = storage?.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeJson(storage: Storage | undefined, key: string, value: unknown): void {
    try {
        storage?.setItem(key, JSON.stringify(value));
    } catch {
        /* the browser won't keep it: the page works without */
    }
}

function isSearch(value: unknown): value is SearchInput {
    const search = value as SearchInput;
    return (
        typeof search?.title === "string" &&
        typeof search.country === "string" &&
        typeof search.city === "string" &&
        (JOBS_PER_SITE as readonly number[]).includes(search.jobsPerSite)
    );
}

/** A stored entry checked field by field, with sites no longer in the catalogue removed. Null when malformed. */
function cleanEntry(value: unknown): HistoryEntry | null {
    const entry = value as HistoryEntry;
    if (typeof entry?.id !== "string" || typeof entry.startedAt !== "string" || !isSearch(entry.search) || !Array.isArray(entry.runs)) {
        return null;
    }
    const runs = entry.runs.filter(
        (run) => typeof run?.site === "string" && typeof run.runId === "string" && actorById(run.site) !== undefined,
    );
    return { id: entry.id, search: entry.search, runs, startedAt: entry.startedAt };
}

export function readHistory(accountId: string, storage: Storage | undefined = browserStorage()): HistoryEntry[] {
    const stored = readJson(storage, historyKey(accountId));
    if (!Array.isArray(stored)) return [];
    return stored.map(cleanEntry).filter((entry): entry is HistoryEntry => entry !== null);
}

/** Puts `entry` first (replacing an older copy of it), keeps the 5 newest, and returns the list. */
export function addHistory(accountId: string, entry: HistoryEntry, storage: Storage | undefined = browserStorage()): HistoryEntry[] {
    const cleaned = cleanEntry(entry) ?? entry;
    const next = [cleaned, ...readHistory(accountId, storage).filter((existing) => existing.id !== entry.id)].slice(0, MAX_ENTRIES);
    writeJson(storage, historyKey(accountId), next);
    return next;
}

/** The sites picked last time, or null when nothing was saved (so the page offers its defaults). */
export function readSites(accountId: string, storage: Storage | undefined = browserStorage()): string[] | null {
    const stored = readJson(storage, sitesKey(accountId));
    if (!Array.isArray(stored)) return null;
    return stored.filter((id): id is string => typeof id === "string" && actorById(id) !== undefined);
}

export function saveSites(accountId: string, sites: string[], storage: Storage | undefined = browserStorage()): void {
    writeJson(storage, sitesKey(accountId), sites);
}
