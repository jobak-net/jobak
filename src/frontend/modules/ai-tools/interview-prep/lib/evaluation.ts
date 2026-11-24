/**
 * The interviewer's evaluation at the end of a practice interview. The agent
 * sends it by calling a client tool the user adds in Agent Builder
 * (`EVALUATION_TOOL`), which reaches this browser as an RPC call; it's never
 * spoken (the tool is "Silent"). Builder's parameters can only be strings,
 * numbers and booleans, so the list of mistakes arrives as JSON text.
 */

export interface InterviewMistake {
    /** What the candidate said, briefly quoted; empty when the interviewer didn't quote. */
    said: string;
    /** Why it hurt the answer. */
    why: string;
    /** A better way to answer. */
    better: string;
}

export interface InterviewEvaluation {
    /** 1 to 10, or null when the interviewer gave none. */
    score: number | null;
    summary: string;
    strengths: string[];
    mistakes: InterviewMistake[];
}

/** What the user enters in Agent Builder › Actions › Add client tool. */
export const EVALUATION_TOOL = {
    name: "submit_evaluation",
    description:
        "Send your evaluation of the whole interview to the candidate's screen. Call it once, when the interview ends: after your last question, when the candidate says they're done, or when you get a message saying the candidate pressed Finish. Never read the evaluation aloud.",
    parameters: [
        { name: "score", type: "integer", description: "Overall performance from 1 (poor) to 10 (excellent)." },
        { name: "summary", type: "string", description: "Two or three sentences on how the interview went overall." },
        { name: "strengths", type: "string", description: "What the candidate did well, one point per line." },
        {
            name: "mistakes",
            type: "string",
            description:
                'Every weak answer or mistake, as a JSON array: [{"said": "a short quote of what they said", "why": "why it hurts", "better": "a better answer"}].',
        },
    ],
    silent: true,
} as const;

/** What Jobak types to the interviewer (topic `lk.chat`) when the user presses "Finish and get feedback". */
export const WRAP_UP_MESSAGE =
    "The candidate pressed Finish, so the interview is over. Say goodbye in one short sentence, then call the submit_evaluation tool with your evaluation of the interview so far. You must call it, even if the interview was short.";

const MAX_TEXT = 2_000;
const MAX_ITEMS = 30;

const text = (value: unknown): string => (typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : "");

function score(value: unknown): number | null {
    const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    return Number.isFinite(n) ? Math.min(10, Math.max(1, Math.round(n))) : null;
}

/** One point per line, without the bullets or numbers a model puts in front. */
function points(value: unknown): string[] {
    const raw = Array.isArray(value) ? value.map(text) : text(value).split(/\r?\n/);
    return raw
        .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
        .filter(Boolean)
        .slice(0, MAX_ITEMS);
}

function mistakes(value: unknown): InterviewMistake[] {
    let list: unknown = value;
    if (typeof value === "string") {
        const unfenced = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
        if (!unfenced) return [];
        try {
            list = JSON.parse(unfenced);
        } catch {
            // Not JSON: keep what the interviewer wrote rather than lose it.
            return [{ said: "", why: text(unfenced), better: "" }];
        }
    }
    if (!Array.isArray(list)) return [];
    return list
        .map((item) => {
            const entry = (item ?? {}) as Record<string, unknown>;
            return { said: text(entry.said), why: text(entry.why), better: text(entry.better) };
        })
        .filter((m) => m.said || m.why || m.better)
        .slice(0, MAX_ITEMS);
}

/**
 * The evaluation from the tool call's payload (its arguments as JSON), read
 * leniently: models vary in how they fill the fields. Null when there's
 * nothing usable in it.
 */
export function parseEvaluation(payload: string): InterviewEvaluation | null {
    let args: Record<string, unknown>;
    try {
        const parsed = JSON.parse(payload) as Record<string, unknown>;
        const inner = parsed?.arguments;
        args = (typeof inner === "string" ? JSON.parse(inner) : (inner ?? parsed)) as Record<string, unknown>;
    } catch {
        return null;
    }
    if (!args || typeof args !== "object") return null;

    const evaluation: InterviewEvaluation = {
        score: score(args.score),
        summary: text(args.summary),
        strengths: points(args.strengths),
        mistakes: mistakes(args.mistakes),
    };
    const empty = !evaluation.summary && evaluation.strengths.length === 0 && evaluation.mistakes.length === 0;
    return empty ? null : evaluation;
}
