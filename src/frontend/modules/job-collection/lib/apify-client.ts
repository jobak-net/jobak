/**
 * The only code in Jobak that talks to Apify, straight from the browser with
 * the user's own token. Jobak's server is never involved: the token stays in
 * this browser and goes to Apify in an `Authorization` header, never in a
 * URL.
 *
 * This file is the one exception to "call `clientFetch`, never `fetch`"
 * (AGENTS.md, docs/frontend/DATA_FETCHING.md): `clientFetch` is built for
 * Jobak's own API. It calls `https://api.apify.com/v2/` and nothing else, and
 * its calls still run through TanStack Query.
 */

const API = "https://api.apify.com/v2";

export type RunStatus =
    | "READY"
    | "RUNNING"
    | "SUCCEEDED"
    | "FAILED"
    | "ABORTING"
    | "ABORTED"
    | "TIMING-OUT"
    | "TIMED-OUT";

export const FINISHED_STATUSES: readonly RunStatus[] = ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"];

export interface ApifyRun {
    id: string;
    status: RunStatus;
    defaultDatasetId: string;
    /**
     * Items collected so far, for progress only: Apify reports it for some
     * actors (charged dataset items), so it's 0 when unknown. Never used to
     * decide whether a run's dataset is worth reading.
     */
    itemCount: number;
    /** What the run has cost so far, when Apify reports it. */
    usageTotalUsd: number | null;
}

export interface ApifyAccount {
    username: string;
    plan: string;
}

export interface ApifyLimits {
    usedUsd: number;
    limitUsd: number;
    /** How many runs the plan allows at once (5 on the free plan). */
    concurrentRuns: number;
}

/** What one actor charges on the free plan. `perJobUsd` is null when it isn't priced per result. */
export interface ActorPrice {
    perJobUsd: number | null;
    startUsd: number;
}

export type ApifyErrorKind =
    | "unauthorized"
    /** The token is valid but limited, and not allowed to do this. */
    | "forbidden"
    | "payment"
    | "not-found"
    | "invalid-input"
    | "rate-limited"
    | "unavailable"
    | "network"
    /** The plan's limit of runs at once is reached: wait for one to finish and try again. */
    | "busy";

/** A failed Apify call. The message is for the developer console; screens word errors from `kind`. */
export class ApifyError extends Error {
    constructor(
        readonly kind: ApifyErrorKind,
        message: string,
    ) {
        super(message);
        this.name = "ApifyError";
    }
}

/**
 * TanStack's `retry` for Apify calls: at most two more tries, and only for
 * failures a second try can fix. A rejected token, missing credit or a bad
 * input fails the same way every time.
 */
export function retryApify(failureCount: number, error: unknown): boolean {
    if (!(error instanceof ApifyError)) return failureCount < 2;
    return ["network", "unavailable", "rate-limited"].includes(error.kind) && failureCount < 2;
}

function kindFor(status: number): ApifyErrorKind {
    if (status === 401) return "unauthorized";
    if (status === 403) return "forbidden";
    if (status === 402) return "payment";
    if (status === 404) return "not-found";
    if (status === 429) return "rate-limited";
    if (status >= 500) return "unavailable";
    return "invalid-input";
}

async function call<T>(path: string, options: { token?: string; method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
    const headers: Record<string, string> = {};
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    if (options.body !== undefined) headers["content-type"] = "application/json";

    let response: Response;
    try {
        response = await fetch(`${API}${path}`, {
            method: options.method ?? "GET",
            headers,
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
        });
    } catch {
        throw new ApifyError("network", "Apify couldn't be reached.");
    }

    if (!response.ok) {
        let message = `Apify answered ${response.status}.`;
        let type = "";
        try {
            const body = (await response.json()) as { error?: { type?: string; message?: string } };
            type = body.error?.type ?? "";
            if (body.error?.message) message = `${type || "error"}: ${body.error.message}`;
        } catch {
            /* not JSON: keep the status */
        }
        // Apify sends "too many runs at once" as 402, like missing credit; it only needs a wait.
        throw new ApifyError(type === "concurrent-runs-limit-exceeded" ? "busy" : kindFor(response.status), message);
    }
    return (await response.json()) as T;
}

/** `user/name` → `user~name`, the form Apify's paths take. */
function actorPath(actorId: string): string {
    return encodeURIComponent(actorId.replace("/", "~"));
}

interface RawRun {
    id: string;
    status: RunStatus;
    defaultDatasetId: string;
    stats?: { itemCount?: number };
    chargedEventCounts?: Record<string, number>;
    usageTotalUsd?: number;
}

function toRun(raw: RawRun): ApifyRun {
    return {
        id: raw.id,
        status: raw.status,
        defaultDatasetId: raw.defaultDatasetId,
        itemCount: raw.chargedEventCounts?.["apify-default-dataset-item"] ?? raw.stats?.itemCount ?? 0,
        usageTotalUsd: typeof raw.usageTotalUsd === "number" ? raw.usageTotalUsd : null,
    };
}

/** Checks a token and says whose it is. A rejected token throws `unauthorized`. */
export async function verifyToken(token: string): Promise<ApifyAccount> {
    const { data } = await call<{ data: { username: string; plan?: { id?: string } } }>("/users/me", { token });
    return { username: data.username, plan: data.plan?.id ?? "unknown" };
}

/** This month's spend against the account's limit. */
export async function getLimits(token: string): Promise<ApifyLimits> {
    const { data } = await call<{
        data: { limits: { maxMonthlyUsageUsd: number; maxConcurrentActorJobs?: number }; current: { monthlyUsageUsd: number } };
    }>("/users/me/limits", { token });
    return {
        usedUsd: data.current.monthlyUsageUsd,
        limitUsd: data.limits.maxMonthlyUsageUsd,
        concurrentRuns: data.limits.maxConcurrentActorJobs ?? 5,
    };
}

interface StoreItem {
    username: string;
    name: string;
    currentPricingInfo?: {
        pricingModel?: string;
        pricePerUnitUsd?: number;
        pricingPerEvent?: {
            actorChargeEvents?: Record<
                string,
                { eventTitle?: string; eventPriceUsd?: number; eventTieredPricingUsd?: Record<string, { tieredEventPriceUsd?: number }> }
            >;
        };
    };
}

/** An actor's free-plan price, from the public store listing (no token). Null when the store doesn't list it. */
export async function actorPrice(actorId: string): Promise<ActorPrice | null> {
    const { data } = await call<{ data: { items: StoreItem[] } }>(`/store?search=${encodeURIComponent(actorId)}&limit=10`);
    const item = data.items.find((candidate) => `${candidate.username}/${candidate.name}` === actorId);
    if (!item) return null;

    const pricing = item.currentPricingInfo ?? {};
    if (pricing.pricingModel === "PRICE_PER_DATASET_ITEM") {
        return { perJobUsd: pricing.pricePerUnitUsd ?? null, startUsd: 0 };
    }

    let perJobUsd: number | null = null;
    let startUsd = 0;
    for (const [key, event] of Object.entries(pricing.pricingPerEvent?.actorChargeEvents ?? {})) {
        const price = event.eventPriceUsd ?? event.eventTieredPricingUsd?.FREE?.tieredEventPriceUsd ?? null;
        if (price === null) continue;
        if (/start|init/i.test(`${key} ${event.eventTitle ?? ""}`)) startUsd = price;
        else if (perJobUsd === null) perJobUsd = price;
    }
    return { perJobUsd, startUsd };
}

/**
 * Starts an actor on the user's account. `maxItems` caps what a
 * pay-per-result actor can charge for, and `maxTotalChargeUsd` caps the run's
 * whole cost: Apify enforces both.
 */
export async function startRun(
    token: string,
    actorId: string,
    input: object,
    options: { maxItems: number; maxTotalChargeUsd: number },
): Promise<ApifyRun> {
    const query = `maxItems=${options.maxItems}&maxTotalChargeUsd=${options.maxTotalChargeUsd}`;
    const { data } = await call<{ data: RawRun }>(`/acts/${actorPath(actorId)}/runs?${query}`, { token, method: "POST", body: input });
    return toRun(data);
}

/** A run's state. With `waitForFinishSecs`, Apify holds the answer until it finishes or that time passes (at most 60). */
export async function getRun(token: string, runId: string, waitForFinishSecs?: number): Promise<ApifyRun> {
    const wait = waitForFinishSecs ? `?waitForFinish=${waitForFinishSecs}` : "";
    const { data } = await call<{ data: RawRun }>(`/actor-runs/${encodeURIComponent(runId)}${wait}`, { token });
    return toRun(data);
}

/** Stops a run. What it collected so far stays in its dataset. */
export async function abortRun(token: string, runId: string): Promise<ApifyRun> {
    const { data } = await call<{ data: RawRun }>(`/actor-runs/${encodeURIComponent(runId)}/abort`, { token, method: "POST" });
    return toRun(data);
}

/** Up to `limit` items of a run's dataset, without Apify's hidden fields. */
export async function datasetItems(token: string, datasetId: string, limit: number): Promise<unknown[]> {
    return call<unknown[]>(`/datasets/${encodeURIComponent(datasetId)}/items?clean=true&limit=${limit}`, { token });
}
