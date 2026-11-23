import { EyeOff, ShieldAlert, TextQuote } from "lucide-react";
import type { ReactNode } from "react";

import type { PostingFinding, PostingFindingKind } from "@/shared/ai-tools";

const KIND: Record<PostingFindingKind, { icon: typeof EyeOff; title: (f: PostingFinding) => string; handling: (f: PostingFinding) => string }> = {
    "invisible-text": {
        icon: EyeOff,
        title: (f) => (f.hiddenMessage ? "Hidden text in the posting" : "Invisible characters"),
        handling: () => "Removed before your AI reads the posting.",
    },
    "ai-instruction": {
        icon: ShieldAlert,
        title: () => "An instruction aimed at AI tools",
        handling: (f) =>
            f.words.length
                ? `Your AI is told to ignore it, and ${quoteList(f.words)} ${f.words.length === 1 ? "is" : "are"} kept out of the letter.`
                : "Your AI is told to ignore it.",
    },
    "word-request": {
        icon: TextQuote,
        title: (f) => `Asks applicants to include ${quoteList(f.words)}`,
        handling: () =>
            "Often a trap to spot AI-written letters, sometimes a real check that you read the posting. Jobak keeps it out; add it yourself if you're sure it's genuine.",
    },
};

function quoteList(words: string[]): string {
    return words.map((w) => `“${w}”`).join(", ");
}

/** The excerpt with each requested word marked. */
function highlight(text: string, words: string[]): ReactNode {
    if (words.length === 0) return text;
    const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    return text.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
            <mark key={i} className="rounded-sm bg-status-amber/25 px-0.5 text-fg-primary">
                {part}
            </mark>
        ) : (
            part
        ),
    );
}

/**
 * What a job posting hides for AI tools (`scanJobPosting`), and what Jobak
 * does about each. Shown live under the posting field, and again with the
 * result. Nothing when the posting is clean.
 */
export function PostingCheck({ findings }: { findings: PostingFinding[] }) {
    if (findings.length === 0) return null;

    return (
        <section
            aria-label="Posting check"
            className="rounded-card border border-status-amber/35 bg-status-amber/6 p-4"
        >
            <p className="flex items-center gap-2 text-[13px] font-medium text-fg-primary">
                <ShieldAlert className="size-4 shrink-0 text-status-amber" />
                This posting hides {findings.length === 1 ? "something" : `${findings.length} things`} for AI tools
            </p>
            <ul className="mt-3 space-y-3">
                {findings.map((finding, i) => {
                    const kind = KIND[finding.kind];
                    const Icon = kind.icon;
                    return (
                        <li key={`${finding.kind}-${finding.start}-${i}`} className="flex gap-2.5">
                            <Icon className="mt-0.5 size-3.5 shrink-0 text-status-amber" />
                            <div className="min-w-0 text-[13px] leading-relaxed">
                                <p className="font-medium text-fg-secondary">{kind.title(finding)}</p>
                                <p className="mt-1 wrap-break-word rounded-control bg-black/25 px-2.5 py-1.5 text-fg-tertiary">
                                    {highlight(finding.excerpt, finding.words)}
                                </p>
                                <p className="mt-1 text-fg-tertiary">{kind.handling(finding)}</p>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
