/**
 * Reading actor output safely. Actor output isn't a versioned contract, and
 * it's text written by strangers on job boards: every value is checked
 * before it's used, and nothing is ever rendered as HTML.
 */

function at(item: unknown, path: string): unknown {
    let value: unknown = item;
    for (const key of path.split(".")) {
        if (value === null || typeof value !== "object") return undefined;
        if (Array.isArray(value)) {
            if (!/^\d+$/.test(key)) return undefined;
            value = value[Number(key)];
        } else {
            value = (value as Record<string, unknown>)[key];
        }
    }
    return value;
}

/** The first of `paths` (dotted, e.g. "company.name") holding non-blank text or a number, trimmed. */
export function firstText(item: unknown, paths: string[]): string | null {
    if (item === null || typeof item !== "object") return null;
    for (const path of paths) {
        const value = at(item, path);
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
}

/** The URL if it's absolute http(s), else null: `javascript:`, `data:` and relative links never become links. */
export function safeUrl(value: string | null): string | null {
    if (!value) return null;
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch {
        return null;
    }
}

/**
 * A posting date as ISO, from an ISO string or an epoch (seconds or ms).
 * Relative text the board shows ("2 days ago") is kept as written.
 */
export function isoDate(value: unknown): string | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        const ms = value < 1e12 ? value * 1000 : value;
        const date = new Date(ms);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
    if (typeof value !== "string" || !value.trim()) return null;
    const text = value.trim();
    // ISO, or a written date with a year ("Nov 20, 2026"); relative text ("3 weeks ago") has none.
    if (/^\d{4}-\d{2}-\d{2}/.test(text) || /\b(19|20)\d{2}\b/.test(text)) {
        const date = new Date(text);
        return Number.isNaN(date.getTime()) ? text : date.toISOString();
    }
    return text;
}
