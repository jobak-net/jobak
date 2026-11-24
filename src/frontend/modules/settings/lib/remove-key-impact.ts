import type { AiProviderId } from "@/shared/ai";

/** What stops, or changes, if a key is removed — shown before the user confirms. */
export interface RemoveKeyImpact {
    /** "stops": nothing left to run on. "switches": another key takes over. "none": this key wasn't in use. */
    kind: "stops" | "switches" | "none";
    title: string;
    body: string;
    /** What stops working, listed when `kind` is "stops". */
    affected: string[];
}

/** Everything that runs on the user's AI key. Kept in one place so the warning stays honest. */
export const AI_FEATURES = [
    "Scoring your new job matches",
    "CV review and CV match",
    "Tailoring your CV to a job",
    "Cover letters",
    "Interview prep",
] as const;

/**
 * The consequence of removing `provider`'s key, given every connected
 * provider (`connected`, preferred first — the API's own order).
 */
export function removeKeyImpact(
    provider: AiProviderId,
    connected: AiProviderId[],
    nameOf: (provider: AiProviderId) => string,
): RemoveKeyImpact {
    const name = nameOf(provider);
    const others = connected.filter((each) => each !== provider);

    if (others.length === 0) {
        return {
            kind: "stops",
            title: `Remove your only AI key?`,
            body: `Without a key, Jobak has no AI to run on. These stop working until you add a key again:`,
            affected: [...AI_FEATURES],
        };
    }
    if (connected[0] === provider) {
        const next = nameOf(others[0]!);
        return {
            kind: "switches",
            title: `Switch your AI to ${next}?`,
            body: `Your AI tools and match scoring move to ${next}, with your ${next} model. Results can read differently, and ${next}'s own limits apply. To use ${name} again, you'd paste its key again.`,
            affected: [],
        };
    }
    return {
        kind: "none",
        title: `Remove your ${name} key?`,
        body: `Nothing changes right now: your AI runs on ${nameOf(connected[0]!)}. To use ${name} later, you'd paste its key again.`,
        affected: [],
    };
}
