import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/frontend/shared/ui";

/**
 * A page, or part of one, that needs something the user hasn't added yet: an
 * AI key for the AI tools, an Apify token for the collectors. While `locked`,
 * the content stays visible but blurred behind a card that says what's
 * missing, how to add it, and links to where it's added:
 *
 *   <LockedFeature
 *     locked={!hasKey}
 *     feature="CV review"
 *     requirement="your AI key"
 *     visual={<AiConnectionDiagram />}
 *     description="Jobak's AI tools run on your own key…"
 *     steps={[{ title: "Pick a provider", hint: "Groq and Gemini have free tiers" }, …]}
 *     action={{ label: "Add your AI key", href: SETTINGS_HREF }}
 *     note="Opens Settings. Takes about a minute."
 *   >
 *     <CvReviewView />
 *   </LockedFeature>
 *
 * Generic on purpose: what's missing, how to tell, and what to show belongs to
 * the feature (e.g. `AiToolGate` in the ai-tools module). This only lays out
 * the card and the lock.
 *
 * When what's missing can be added right there (a token kept in the browser),
 * pass `action={{ content: <TheForm /> }}` instead of a link: the form sits in
 * the card, and the feature unlocks without leaving the page.
 *
 * The locked content is `inert` — no clicks, no keyboard focus, hidden from
 * screen readers — so the card is the only thing to act on, and nothing
 * behind it can be started by accident. Decide `locked` on the server where
 * possible, so the page never flashes unlocked first.
 */
export function LockedFeature({
    locked,
    feature,
    requirement,
    description,
    action,
    visual,
    steps,
    note,
    children,
}: {
    locked: boolean;
    /** What it unlocks, as it reads mid-sentence ("To unlock …, add …"): "CV review", "job collection". */
    feature: string;
    /** What's missing, as it ends the sentence "To unlock …, add …": "your AI key". */
    requirement: string;
    /** Why it's needed, in one sentence. */
    description: ReactNode;
    /** Where it's added (a link), or the form that adds it right in the card. */
    action: { label: string; href: string } | { content: ReactNode };
    /** Shown above the title: a picture of what's missing (e.g. the AI connection that isn't there). */
    visual?: ReactNode;
    /** How to add it, when that's a real sequence. Numbered, so only for steps done in order. */
    steps?: { title: string; hint?: string }[];
    /** One quiet line under the button: where it goes, how long it takes. */
    note?: ReactNode;
    children: ReactNode;
}) {
    if (!locked) return <>{children}</>;

    return (
        <div className="relative isolate min-h-[620px]">
            {/* The page behind, as a preview of what's waiting. */}
            <div inert aria-hidden="true" className="pointer-events-none select-none opacity-45 blur-[5px] saturate-50">
                {children}
            </div>

            <div className="absolute inset-0 z-10 flex justify-center bg-[radial-gradient(70%_55%_at_50%_30%,var(--bg-canvas)_15%,transparent_85%)] px-4">
                <section
                    aria-labelledby="locked-feature-title"
                    className="ob-rise sticky top-24 mt-16 h-fit w-full max-w-[460px] rounded-[24px] border border-border-standard bg-bg-panel p-7 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] sm:p-9"
                >
                    {visual && <div className="mb-8">{visual}</div>}

                    <h2
                        id="locked-feature-title"
                        className="text-[22px] font-semibold leading-tight tracking-[-0.03em] text-fg-primary"
                    >
                        To unlock {feature}, add {requirement}
                    </h2>
                    <div className="mt-3 text-sm leading-relaxed text-fg-tertiary">{description}</div>

                    {steps && steps.length > 0 && (
                        <ol className="mt-8 space-y-6">
                            {steps.map((step, i) => (
                                <li key={step.title} className="flex gap-4">
                                    <span
                                        aria-hidden="true"
                                        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border-standard text-[12px] font-medium tabular-nums text-fg-secondary"
                                    >
                                        {i + 1}
                                    </span>
                                    <span>
                                        <span className="block text-sm font-medium text-fg-primary">{step.title}</span>
                                        {step.hint && (
                                            <span className="mt-1 block text-[13px] leading-relaxed text-fg-tertiary">{step.hint}</span>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}

                    {"content" in action ? (
                        <div className="mt-8">{action.content}</div>
                    ) : (
                        <Button variant="primary" asChild className="mt-8 w-full">
                            <Link href={action.href}>{action.label}</Link>
                        </Button>
                    )}
                    {note && <p className="mt-4 text-center text-[12px] leading-relaxed text-fg-quaternary">{note}</p>}
                </section>
            </div>
        </div>
    );
}
