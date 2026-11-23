import { ArrowUpRight, Info } from "lucide-react";

/** An outside AI detector the note points to. Not ours: it opens in a new tab, and nothing is sent to it. */
const AI_DETECTOR_URL = "https://www.humanizeai.pro/detector";

/**
 * Above the draft: what to do before sending it. The letter can still read as
 * AI-written, or claim something the user didn't say, and only they can fix both.
 */
export function BeforeYouSend() {
    return (
        <div className="mb-3 flex items-start gap-2 rounded-control border border-border-subtle bg-bg-panel p-3 text-[13px] leading-relaxed text-fg-tertiary">
            <Info className="mt-0.5 size-3.5 shrink-0 text-fg-secondary" />
            <p>
                <span className="font-medium text-fg-secondary">Check it before you send it.</span> Make sure every claim
                is true, then paste the letter into an AI detector or humanizer, such as{" "}
                <a
                    href={AI_DETECTOR_URL}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-0.5 font-medium text-accent-text underline underline-offset-2"
                >
                    HumanizeAI&apos;s detector
                    <ArrowUpRight className="size-3" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                </a>
                , and reword what it flags in your own words.
            </p>
        </div>
    );
}
