#!/usr/bin/env node
/**
 * Builds the job title catalogue's seed migration from the O*NET database.
 *
 * Downloads two files from the O*NET Resource Center:
 *   - occupation_data.csv            every occupation and its O*NET-SOC code
 *   - sample_of_reported_titles.csv  the titles real workers in each occupation
 *                                    gave for their own job (~8k)
 *
 * Reported titles are used rather than the occupation names because they read
 * like job postings ("Software Engineer"), where occupation names are plural
 * categories ("Software Developers") that no job board would ever list.
 *
 * Each title gets a Jobak field from its occupation code (most specific rule
 * wins, then a few keyword overrides for roles O*NET files under broad codes,
 * like "Product Manager"), is cleaned (see `cleanTitles`) and is de-duplicated
 * case-insensitively.
 *
 * Writes db/supabase/023_seed_onet_job_titles.sql. Inserts use ON CONFLICT DO
 * NOTHING, so the curated titles from 004 always win a collision and the seed
 * is safe to re-run. When O*NET publishes a new release, run this with the new
 * version and commit the result as a new seed file rather than editing 023.
 *
 * Usage:
 *   tsx scripts/job-titles/generate-onet-seed.ts            (O*NET 31.0)
 *   tsx scripts/job-titles/generate-onet-seed.ts 32_0       (a later release)
 *
 * Licence: O*NET is CC BY 4.0. The attribution is written into the SQL file
 * and must stay with the data — see ATTRIBUTION below.
 */

import { writeFileSync } from "fs";
import { join } from "path";

const VERSION = process.argv[2] ?? "31_0";
const BASE = `https://www.onetcenter.org/dl_files/database/db_${VERSION}_csv`;
const OUT = join(process.cwd(), "db", "supabase", "023_seed_onet_job_titles.sql");

const ATTRIBUTION = [
    `This file includes information from the O*NET ${VERSION.replace("_", ".")} Database by the U.S. Department`,
    "of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0",
    "license. O*NET® is a trademark of USDOL/ETA. Jobak has modified all or some of this",
    "information (titles cleaned, de-duplicated and grouped into Jobak fields). USDOL/ETA has",
    "not approved, endorsed, or tested these modifications.",
];

/*
 * O*NET-SOC code prefix → Jobak field (job_fields.value). The longest matching
 * prefix wins, so a specific occupation can override its group: "15-1212"
 * (information security analysts) is security even though "15" is not listed.
 * Military occupations (55-) are left out: they are not hired through job boards.
 */
const FIELD_RULES: Record<string, string> = {
    // 11 Management
    "11": "management",
    "11-2011": "marketing",
    "11-2021": "marketing",
    "11-2022": "sales",
    "11-2032": "marketing",
    "11-2033": "marketing",
    "11-3031": "finance",
    "11-3071": "logistics",
    "11-3111": "operations",
    "11-3121": "operations",
    "11-3131": "operations",
    "11-9013": "agriculture",
    "11-9021": "construction",
    "11-9031": "education",
    "11-9032": "education",
    "11-9033": "education",
    "11-9039": "education",
    "11-9041": "engineering",
    "11-9051": "hospitality",
    "11-9081": "hospitality",
    "11-9111": "healthcare",
    "11-9121": "science",
    // 13 Business and financial
    "13-1": "operations",
    "13-1081": "logistics",
    "13-1161": "marketing",
    "13-2": "finance",
    // 15 Computer and mathematical
    "15-1211": "software-engineering",
    "15-1211.01": "data",
    "15-1212": "security",
    "15-1221": "ai-ml",
    "15-1231": "devops",
    "15-1232": "devops",
    "15-1241": "devops",
    "15-1242": "data",
    "15-1243": "data",
    "15-1244": "devops",
    "15-1251": "software-engineering",
    "15-1252": "software-engineering",
    "15-1253": "software-engineering",
    "15-1254": "software-engineering",
    "15-1255": "design",
    "15-1299": "software-engineering",
    "15-1299.01": "devops",
    "15-1299.02": "data",
    "15-1299.03": "data",
    "15-1299.04": "security",
    "15-1299.05": "security",
    "15-1299.06": "security",
    "15-1299.09": "operations",
    "15-2": "data",
    "15-2011": "finance",
    "15-2021": "science",
    // 17–25
    "17": "engineering",
    "19": "science",
    "21": "community",
    "23": "legal",
    "25": "education",
    // 27 Arts, design, entertainment, media
    "27-1": "design",
    "27-1012": "arts-media",
    "27-1013": "arts-media",
    "27-2": "arts-media",
    "27-3": "content",
    "27-3031": "marketing",
    "27-4": "arts-media",
    // 29–53
    "29": "healthcare",
    "31": "healthcare",
    "33": "protective-services",
    "35": "hospitality",
    "37": "skilled-trades",
    "39": "hospitality",
    "41": "sales",
    "43": "administrative",
    "43-3": "finance",
    "43-4051": "customer-success",
    "43-5": "logistics",
    "45": "agriculture",
    "47": "construction",
    "49": "skilled-trades",
    "51": "manufacturing",
    "53": "logistics",
};

/** Roles O*NET files under a broad occupation but that Jobak has a field for. */
const KEYWORD_OVERRIDES: [RegExp, string][] = [
    [/\b(machine learning|deep learning|artificial intelligence|computer vision|nlp|ai)\b/i, "ai-ml"],
    [/\bproduct (manager|owner|director|lead)\b/i, "product"],
    [/\b(ux|ui|user experience|user interface|interaction designer)\b/i, "design"],
    [/\b(devops|site reliability|sre|cloud engineer|platform engineer)\b/i, "devops"],
    [/\bdata scien/i, "data"],
];

function fieldFor(code: string, title: string): string | null {
    if (code.startsWith("55-")) return null;

    for (const [pattern, field] of KEYWORD_OVERRIDES) {
        if (pattern.test(title)) return field;
    }

    let best: string | null = null;
    let bestLength = 0;
    for (const [prefix, field] of Object.entries(FIELD_RULES)) {
        if (code.startsWith(prefix) && prefix.length > bestLength) {
            best = field;
            bestLength = prefix.length;
        }
    }
    return best;
}

/** A word postings actually use in short form: "HR", "UX", "CEO", "DevOps". */
const TERM_OF_ART = /\b([A-Z]{2,}|[A-Z][a-z]+[A-Z]\w*)\b/;

/**
 * Tidies a reported title into one or two search terms.
 *
 * O*NET often lists a title with an alternative in brackets, in either order:
 * "Claims Representative (Claims Rep)", "PBX Operator (Post Box Exchange
 * Operator)". The spelled-out form is always kept. The short form is kept as
 * well only when it uses a real term of art — "HR Assistant", "DevOps
 * Engineer", "CEO" are what postings say — and dropped when it is just a
 * truncation like "Claims Rep" or "Lab Tech".
 */
function cleanTitles(raw: string): string[] {
    const title = raw.replace(/\s+/g, " ").trim();
    const valid = (t: string) => t.length >= 2 && t.length <= 80;

    const match = /^([^()]+?)\s*\(([^()]+)\)$/.exec(title);
    if (!match) return valid(title) ? [title] : [];

    const a = match[1]!.trim();
    const b = match[2]!.trim();
    const [short, long] = a.length <= b.length ? [a, b] : [b, a];
    const terms = TERM_OF_ART.test(short) ? [long, short] : [long];
    return terms.filter(valid);
}

/** How good a title is as a suggestion; lower is better. */
enum Rank {
    /** The occupation's own name, singular: "Registered Nurse". */
    Generic = 0,
    /** A reported title O*NET shows in My Next Move. */
    Common = 1,
    Other = 2,
    /** All capitals, like "ACNP": searchable, but not suggested first. */
    Acronym = 3,
}

/**
 * "Registered Nurses" → "Registered Nurse". Only for names that read as one
 * job: lists ("Graders and Sorters, Agricultural Products"), catch-alls ("All
 * Other") and names where the word before "and" is plural ("Farmers and
 * Ranchers" would become "Farmers and Rancher") are skipped — their reported
 * titles cover them.
 */
function singularOccupation(name: string): string | null {
    const text = name.replace(/\s+/g, " ").trim();
    if (/[,/]|--|\bAll Other\b|\bExcept\b/.test(text) || text.length > 60) return null;
    // The plural is not the last word: "First-Line Supervisors of Police".
    if (/\b\w+s (and|of|in|for)\b/.test(text)) return null;

    const words = text.split(" ");
    const last = words.pop()!;
    let singular: string;
    if (/wives$/.test(last)) singular = last.replace(/wives$/, "wife");
    else if (/ies$/.test(last)) singular = last.replace(/ies$/, "y");
    else if (/(ches|shes|sses|xes|zes)$/.test(last)) singular = last.replace(/es$/, "");
    else if (/men$/.test(last)) singular = last.replace(/men$/, "man");
    else if (/[^s]s$/.test(last)) singular = last.slice(0, -1);
    else return null; // not a plural we know how to undo
    return [...words, singular].join(" ");
}

/** RFC 4180 CSV: quoted fields, doubled quotes, newlines inside quotes. */
function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"' && text[i + 1] === '"') {
                field += '"';
                i++;
            } else if (c === '"') quoted = false;
            else field += c;
        } else if (c === '"') quoted = true;
        else if (c === ",") {
            row.push(field);
            field = "";
        } else if (c === "\n" || c === "\r") {
            if (c === "\r" && text[i + 1] === "\n") i++;
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else field += c;
    }
    if (field || row.length) {
        row.push(field);
        rows.push(row);
    }
    return rows.filter((r) => r.some((value) => value.trim() !== ""));
}

async function download(file: string): Promise<string[][]> {
    const url = `${BASE}/${file}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    const text = await response.text();
    if (text.trimStart().startsWith("<")) throw new Error(`${url} returned HTML, not CSV — wrong version?`);
    return parseCsv(text).slice(1); // drop the header row
}

const sql = (value: string) => `'${value.replace(/'/g, "''")}'`;

async function main() {
    console.log(`Downloading O*NET ${VERSION}…`);
    const [occupations, reported] = await Promise.all([
        download("occupation_data.csv"),
        download("sample_of_reported_titles.csv"),
    ]);
    const knownCodes = new Set(occupations.map(([code]) => code));

    type Row = { field: string; title: string; code: string; rank: Rank };
    const byKey = new Map<string, Row>();
    let skipped = 0;

    function keep(code: string, title: string, rank: Rank) {
        const field = fieldFor(code, title);
        if (!field) {
            skipped++;
            return;
        }
        const key = title.toLowerCase();
        const existing = byKey.get(key);
        // A title under several occupations keeps its best-ranked occurrence.
        if (!existing || rank < existing.rank) byKey.set(key, { field, title, code, rank });
    }

    // The occupation's own name, made singular, is the most generic title of
    // all — and O*NET's reported titles never include it: nobody under
    // "Registered Nurses" reported plain "Registered Nurse".
    for (const [code = "", name = ""] of occupations) {
        const title = singularOccupation(name);
        if (title) keep(code, title, Rank.Generic);
    }

    for (const [code = "", , reportedTitle = "", shown = ""] of reported) {
        if (!knownCodes.has(code)) continue;
        const titles = cleanTitles(reportedTitle);
        if (titles.length === 0) skipped++;
        for (const title of titles) {
            // A bare acronym ("ACNP") is a fine search term but a poor suggestion.
            const rank = !/[a-z]/.test(title) ? Rank.Acronym : shown === "Y" ? Rank.Common : Rank.Other;
            keep(code, title, rank);
        }
    }

    // Within a field, best rank first, then shorter (the generic "Nurse"
    // before "Adult Psychiatric Mental Health Nurse"), then A–Z. The first few
    // become the field's suggestions. Offset past the curated titles (1–99).
    const byField = new Map<string, Row[]>();
    for (const row of byKey.values()) {
        if (!byField.has(row.field)) byField.set(row.field, []);
        byField.get(row.field)!.push(row);
    }

    const values: string[] = [];
    for (const [field, rows] of [...byField.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        rows.sort((a, b) => a.rank - b.rank || a.title.length - b.title.length || a.title.localeCompare(b.title));
        rows.forEach((row, i) => {
            values.push(`  (${sql(field)}, ${sql(row.title)}, ${1000 + i}, 'onet', ${sql(row.code)})`);
        });
    }

    const CHUNK = 500;
    const inserts: string[] = [];
    for (let i = 0; i < values.length; i += CHUNK) {
        inserts.push(
            "INSERT INTO job_titles (field_value, title, sort_order, source, onet_code) VALUES\n" +
                values.slice(i, i + CHUNK).join(",\n") +
                "\nON CONFLICT DO NOTHING;",
        );
    }

    const header = [
        "-- ============================================================",
        `-- Jobak — job title catalogue, O*NET ${VERSION.replace("_", ".")} seed`,
        "-- GENERATED by scripts/job-titles/generate-onet-seed.ts — do not edit by hand.",
        "-- Applied by the migration runner after 022_job_title_catalogue.sql.",
        "-- ============================================================",
        "--",
        ...ATTRIBUTION.map((line) => `-- ${line}`),
        "--",
        `-- ${values.length} titles across ${byField.size} fields. ON CONFLICT DO NOTHING: the`,
        "-- curated titles from 004 win any collision, and re-running is harmless.",
        "",
    ].join("\n");

    // Fresh planner statistics for the search index, which these inserts just filled.
    const footer = "\n\nANALYZE job_titles;\n";
    writeFileSync(OUT, header + "\n" + inserts.join("\n\n") + footer, "utf-8");

    console.log(`Wrote ${values.length} titles (${skipped} skipped) to ${OUT}`);
    for (const [field, rows] of [...byField.entries()].sort((a, b) => b[1].length - a[1].length)) {
        console.log(`  ${field.padEnd(22)} ${rows.length}`);
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
