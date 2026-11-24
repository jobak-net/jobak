/**
 * Checks the job-collection catalogue against Apify. Reads APIFY_API_KEY from
 * .env and never prints it.
 *
 *   pnpm check:apify schema <user/name>...   compact input schema of store actors (free)
 *   pnpm check:apify validate <id|all>...    Apify's own input check for each entry, no run (free)
 *   pnpm check:apify live <id|all>...        one run per entry, 3 jobs, capped; saves the fixture (costs credit)
 *
 * `live` writes src/frontend/modules/job-collection/config/actors/__fixtures__/<id>.json
 * with contact fields removed and long text cut short, and prints what readJob makes of each item.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ACTORS } from "../src/frontend/modules/job-collection/config/actors";
import type { ActorEntry, SearchInput } from "../src/frontend/modules/job-collection/types/catalogue";

const API = "https://api.apify.com/v2";
const FIXTURES = join(__dirname, "../src/frontend/modules/job-collection/config/actors/__fixtures__");
const CONTACT = /email|phone|contact|recruiter|whatsapp|telegram|mobile/i;

function token(): string {
    const value = process.env.APIFY_API_KEY;
    if (!value) throw new Error("APIFY_API_KEY is not set (run with --env-file=.env)");
    return value;
}

async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const response = await fetch(`${API}${path}`, {
        method: init.method ?? "GET",
        headers: { authorization: `Bearer ${token()}`, "content-type": "application/json" },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 300)}`);
    return JSON.parse(text) as T;
}

const actorPath = (actorId: string) => actorId.replace("/", "~");

function entriesFor(args: string[]): ActorEntry[] {
    if (args.includes("all")) return [...ACTORS];
    return args.map((id) => {
        const entry = ACTORS.find((candidate) => candidate.id === id);
        if (!entry) throw new Error(`No catalogue entry "${id}"`);
        return entry;
    });
}

/** A country with plenty of software jobs the entry covers: Egypt first, then big markets. */
function sampleCountry(entry: ActorEntry): string {
    if (entry.covers === "any") return "EG";
    return ["EG", "AE", "US", "GB", "DE", "IN", "AU", "BR", "MX"].find((code) => entry.covers.includes(code)) ?? entry.covers[0];
}

function sampleSearch(entry: ActorEntry): SearchInput {
    return { title: "Software Engineer", country: sampleCountry(entry), city: "", jobsPerSite: 10 };
}

interface SchemaProperty {
    type?: string;
    enum?: unknown[];
    default?: unknown;
    prefill?: unknown;
    editor?: string;
}

async function schema(actorIds: string[]) {
    for (const actorId of actorIds) {
        try {
            const { data: actor } = await api<{ data: { taggedBuilds?: Record<string, { buildId: string }> } }>(`/acts/${actorPath(actorId)}`);
            const buildId = actor.taggedBuilds?.latest?.buildId;
            if (!buildId) throw new Error("no latest build");
            const { data: build } = await api<{ data: { inputSchema?: string; actorDefinition?: { input?: unknown } } }>(`/actor-builds/${buildId}`);
            const input = (build.actorDefinition?.input ?? (build.inputSchema ? JSON.parse(build.inputSchema) : null)) as {
                properties?: Record<string, SchemaProperty>;
                required?: string[];
            } | null;
            console.log(`## ${actorId}${input?.required?.length ? `  required: ${input.required.join(", ")}` : ""}`);
            for (const [key, prop] of Object.entries(input?.properties ?? {})) {
                const parts = [prop.type ?? prop.editor ?? "?"];
                if (prop.enum) parts.push(`enum ${JSON.stringify(prop.enum).slice(0, process.env.FULL ? undefined : 160)}`);
                if (prop.default !== undefined) parts.push(`default ${JSON.stringify(prop.default).slice(0, 60)}`);
                else if (prop.prefill !== undefined) parts.push(`prefill ${JSON.stringify(prop.prefill).slice(0, 60)}`);
                console.log(`  ${key}: ${parts.join(" | ")}`);
            }
        } catch (error) {
            console.log(`## ${actorId}  FAILED ${(error as Error).message}`);
        }
    }
}

async function validate(entries: ActorEntry[]) {
    for (const entry of entries) {
        const searches = [sampleSearch(entry), { ...sampleSearch(entry), city: entry.covers === "any" ? "Cairo" : "" }];
        for (const search of searches) {
            try {
                await api(`/acts/${actorPath(entry.actorId)}/validate-input`, { method: "POST", body: entry.buildInput(search) });
                console.log(`ok   ${entry.id} (${search.country}${search.city ? `, ${search.city}` : ""})`);
            } catch (error) {
                console.log(`FAIL ${entry.id} (${search.country}): ${(error as Error).message}`);
            }
        }
    }
}

/** Contact fields removed, long strings cut, big arrays trimmed: a small, safe fixture. */
function scrub(value: unknown, depth = 0): unknown {
    if (typeof value === "string") return value.length > 300 ? `${value.slice(0, 300)}…` : value;
    if (Array.isArray(value)) return value.slice(0, 3).map((inner) => scrub(inner, depth + 1));
    if (value && typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const [key, inner] of Object.entries(value)) {
            if (CONTACT.test(key)) continue;
            out[key] = depth > 3 ? "[…]" : scrub(inner, depth + 1);
        }
        return out;
    }
    return value;
}

interface Run {
    id: string;
    status: string;
    defaultDatasetId: string;
    usageTotalUsd?: number;
    statusMessage?: string;
}

/** Runs `work` over `items`, at most `limit` at a time: the free Apify plan allows 5 concurrent runs. */
async function pool<T>(items: T[], limit: number, work: (item: T) => Promise<void>) {
    const queue = [...items];
    await Promise.all(
        Array.from({ length: Math.min(limit, queue.length) }, async () => {
            for (let item = queue.shift(); item !== undefined; item = queue.shift()) await work(item);
        }),
    );
}

async function live(entries: ActorEntry[]) {
    mkdirSync(FIXTURES, { recursive: true });
    let spent = 0;
    await pool(
        entries,
        4,
        async (entry) => {
            const { perJobUsd, startUsd } = entry.fallbackPrice;
            const cap = Math.round(((3 * perJobUsd + 2 * startUsd) * 1.5 + 0.01) * 10_000) / 10_000;
            const input = entry.buildInput({ ...sampleSearch(entry), jobsPerSite: 10 });
            try {
                let { data: run } = await api<{ data: Run }>(`/acts/${actorPath(entry.actorId)}/runs?maxItems=3&maxTotalChargeUsd=${cap}`, {
                    method: "POST",
                    body: input,
                });
                for (let i = 0; i < 8 && !["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run.status); i++) {
                    ({ data: run } = await api<{ data: Run }>(`/actor-runs/${run.id}?waitForFinish=60`));
                }
                if (!["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run.status)) {
                    await api(`/actor-runs/${run.id}/abort`, { method: "POST" });
                }
                const items = await api<unknown[]>(`/datasets/${run.defaultDatasetId}/items?clean=true&limit=3`);
                spent += run.usageTotalUsd ?? 0;
                const lines = [`## ${entry.id}: ${run.status} ${run.statusMessage ?? ""}, ${items.length} items, $${(run.usageTotalUsd ?? 0).toFixed(4)} (cap $${cap})`];
                if (items[0]) {
                    writeFileSync(join(FIXTURES, `${entry.id}.json`), `${JSON.stringify(scrub(items[0]), null, 2)}\n`);
                    lines.push(`   keys: ${Object.keys(items[0] as object).join(", ").slice(0, 400)}`);
                }
                for (const item of items) lines.push(`   readJob: ${JSON.stringify(entry.readJob(item))?.slice(0, 300)}`);
                console.log(lines.join("\n"));
            } catch (error) {
                console.log(`## ${entry.id}: FAILED ${(error as Error).message}`);
            }
        },
    );
    console.log(`\nspent about $${spent.toFixed(4)}`);
}

async function main() {
    const [command, ...args] = process.argv.slice(2);
    if (command === "schema") return schema(args);
    if (command === "validate") return validate(entriesFor(args));
    if (command === "live") {
        if (!args.length) throw new Error("live needs entry ids or `all`");
        return live(entriesFor(args));
    }
    throw new Error("usage: check:apify schema <user/name>... | validate <id|all>... | live <id|all>...");
}

main().catch((error) => {
    console.error((error as Error).message);
    process.exit(1);
});
