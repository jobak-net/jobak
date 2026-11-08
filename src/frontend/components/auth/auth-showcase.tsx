"use client";

import { usePathname } from "next/navigation";
import { MapPin, Sparkles } from "lucide-react";

import { ScoreRing } from "@/frontend/components/dashboard/score-ring";
import { SIGN_UP_HREF } from "@/frontend/lib/configs/cta";
import { SAMPLE_JOBS } from "@/frontend/lib/mocks/dashboard";

/** The three strongest sample jobs — what a fresh profile's dashboard opens on. */
const PREVIEW_JOBS = [...SAMPLE_JOBS]
    .filter((job) => job.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);

/**
 * A small working preview of the product, built from the dashboard's own
 * pieces (score rings, job rows) with sample jobs — not a screenshot and not a
 * drawn mock-up, so it can never drift out of date with the real UI.
 *
 * Decorative: hidden from assistive tech, since the copy beside it says the
 * same thing in words.
 */
function ProductPreview() {
    const top = PREVIEW_JOBS[0];

    return (
        <div aria-hidden="true" className="relative mt-12 pr-6 xl:pr-0">
            <div className="rounded-card border border-white/10 bg-[#0b0d0c]/90 p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-sm">
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-fg-primary">Top matches</p>
                    <p className="text-xs text-fg-tertiary">Sorted by score</p>
                </div>
                <ul className="divide-y divide-white/6">
                    {PREVIEW_JOBS.map((job) => (
                        <li key={job.id} className="flex items-center gap-3.5 py-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-white/5 text-sm font-semibold text-fg-tertiary">
                                {job.company.charAt(0)}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-fg-primary">{job.title}</span>
                                <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-fg-tertiary">
                                    {job.company}
                                    <span>·</span>
                                    <MapPin className="size-3 shrink-0" />
                                    {job.location}
                                </span>
                            </span>
                            <ScoreRing score={job.score} size={38} />
                        </li>
                    ))}
                </ul>
            </div>

            {/* The overlapping card, as in the references: one moment, pulled forward. */}
            {top && (
                <div className="absolute -bottom-8 -left-6 flex items-center gap-3 rounded-card border border-white/10 bg-[#101412] px-4 py-3 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] xl:-left-10">
                    <span className="flex size-8 items-center justify-center rounded-full bg-accent/15">
                        <Sparkles className="size-4 text-accent" />
                    </span>
                    <span>
                        <span className="block text-xs text-fg-tertiary">New strong match</span>
                        <span className="block text-sm font-medium text-fg-primary">
                            {top.title}, {top.score}
                        </span>
                    </span>
                </div>
            )}
        </div>
    );
}

/**
 * The visual half of the sign-in and sign-up pages: an inset panel with the
 * pitch and a preview of what is on the other side of the form.
 *
 * A client component only to read the path — one layout serves both pages, and
 * a returning user should be greeted differently from a new one.
 */
export function AuthShowcase() {
    const isSignUp = usePathname().startsWith(SIGN_UP_HREF);

    return (
        <aside
            className="relative hidden overflow-hidden rounded-hero border border-white/6 lg:flex lg:flex-col lg:justify-center lg:px-12 xl:px-16"
            style={{
                background:
                    "radial-gradient(120% 80% at 15% 0%, rgba(88,230,140,0.16), transparent 55%), linear-gradient(160deg, #0f2419 0%, #0a100d 55%, #08090a 100%)",
            }}
        >
            {/* Dot grid, fading out toward the bottom-right so it never fights the text. */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                    backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
                    backgroundSize: "18px 18px",
                    maskImage: "radial-gradient(90% 70% at 20% 20%, black, transparent 75%)",
                    WebkitMaskImage: "radial-gradient(90% 70% at 20% 20%, black, transparent 75%)",
                }}
            />

            <div className="relative mx-auto w-full max-w-lg">
                {/* Not an h1: Clerk's form carries the page heading. */}
                <p className="text-4xl font-semibold leading-[1.1] tracking-[-0.04em] text-fg-primary xl:text-[44px]">
                    {isSignUp ? "Let the job search come to you." : "Your matches kept coming in."}
                </p>
                <p className="mt-4 max-w-md text-base leading-relaxed text-fg-secondary/80">
                    {isSignUp
                        ? "Set your preferences once. Jobak searches the boards and scores every opening for you."
                        : "Jobak kept searching while you were away. Sign in to see what scored highest."}
                </p>

                <ProductPreview />
            </div>
        </aside>
    );
}
