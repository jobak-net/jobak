import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { cn } from "@/frontend/lib/utils/utils";

const STEPS = [
    {
        title: "Preferences set",
        body: "Change your roles, countries or work mode any time.",
        href: "/dashboard/preferences",
        done: true,
    },
    { title: "Connect your AI key", body: "Jobak ranks jobs with your own Groq key.", href: "/dashboard/settings", done: false },
    { title: "Review your CV", body: "See what to fix before you apply.", href: "/dashboard/cv-review", done: false },
    { title: "Check your matches", body: "Scored 0 to 100, best fit first.", href: "/dashboard/matches", done: false },
];

/**
 * What to do while the first matches are found, as one strip.
 *
 * Shown until the user has real matches. Nobody reaches the dashboard without
 * finishing onboarding, so the first step — the search preferences — is always
 * done here; it stays in the strip, ticked, as the place to change them. The
 * others link to their pages and are numbered as a suggested order, not
 * tracked: the settings and CV pages are previews that can't be completed yet.
 */
export function GettingStarted() {
    return (
        <ol className="grid overflow-hidden rounded-card border border-border-subtle sm:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((step, i) => (
                <li
                    key={step.href}
                    className="border-border-subtle not-last:border-b sm:odd:border-r sm:nth-[-n+2]:border-b xl:border-b-0! xl:not-last:border-r"
                >
                    <Link href={step.href} className="group flex h-full gap-3.5 p-5 transition-colors hover:bg-white/2.5">
                        <span
                            className={cn(
                                "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums transition-colors",
                                step.done
                                    ? "border-accent bg-accent text-[#06210f]"
                                    : "border-border-strong text-fg-tertiary group-hover:border-accent group-hover:text-accent",
                            )}
                        >
                            {step.done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                            {step.done && <span className="sr-only">Done:</span>}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-fg-primary">
                                {step.title}
                                <ArrowRight className="size-3.5 text-fg-quaternary transition-transform group-hover:translate-x-0.5 group-hover:text-fg-primary" />
                            </span>
                            <span className="mt-1 block text-[13px] leading-relaxed text-fg-tertiary">{step.body}</span>
                        </span>
                    </Link>
                </li>
            ))}
        </ol>
    );
}
