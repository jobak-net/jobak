"use client";

import type { CSSProperties } from "react";
import { Check, FileText, Lock, PenLine, Sparkles, Target, X } from "lucide-react";

import { AiProviderMark } from "@/frontend/components/shared/ai-provider-marks";
import { JobakMark } from "@/frontend/components/shared/jobak-logo";
import { cn } from "@/frontend/lib/utils/utils";
import type { AiProvider } from "@/frontend/types/on-boarding";

import { PROVIDER_INFO } from "./providers";

export type ConnectionStatus = "waiting" | "chosen" | "checking" | "connected" | "failed";

const HEADLINES: Record<ConnectionStatus, { title: string; body: string }> = {
    waiting: {
        title: "Jobak works with the AI you choose.",
        body: "Your key, your account, your model. Jobak sends it your job search and nothing else.",
    },
    chosen: {
        title: "One key, and the searching starts.",
        body: "Jobak checks the key with your provider before saving it, so a typo never fails silently later.",
    },
    checking: {
        title: "Checking with your provider…",
        body: "A read-only request that costs nothing. It only confirms the key is real and switched on.",
    },
    connected: {
        title: "Connected.",
        body: "From now on, every job Jobak finds is scored for you by your own AI.",
    },
    failed: {
        title: "That key didn't work.",
        body: "Nothing was saved. Check the key and try again, or pick a different provider.",
    },
};

const USES = [
    { icon: Target, text: "Scores every job it finds from 0 to 100 against your preferences" },
    { icon: FileText, text: "Reviews your CV and tells you what to fix" },
    { icon: PenLine, text: "Drafts cover letters for the jobs you choose" },
];

/**
 * The right-hand panel of the AI setup: Jobak and the chosen provider, and
 * the line between them.
 *
 * The line tells the state at a glance — dashed and still while waiting,
 * flowing while the key is checked, solid green once connected, red when the
 * key is refused. Decorative: the form on the left says all of it in words,
 * so this is hidden from assistive tech.
 */
export function ConnectionPanel({ provider, status }: { provider: AiProvider | null; status: ConnectionStatus }) {
    const headline = HEADLINES[status];
    const connected = status === "connected";
    const failed = status === "failed";
    const checking = status === "checking";

    const lineClass = connected
        ? "stroke-accent"
        : failed
          ? "stroke-status-rose"
          : checking
            ? "stroke-accent/80"
            : "stroke-white/20";

    return (
        <div
            aria-hidden="true"
            className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(120%_80%_at_50%_0%,oklch(0.82_0.2_145/0.14),transparent_60%),linear-gradient(180deg,#111314,#0b0c0d)]"
        >
            <div className="pointer-events-none absolute -left-40 bottom-0 size-150 bg-[radial-gradient(closest-side,oklch(0.82_0.2_145/0.08),transparent)]" />

            <header className="relative z-10 px-10 pt-14 text-center xl:px-16">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-medium text-[#0b0c0d]">
                    <Sparkles className="size-3" strokeWidth={2.5} /> Your AI
                </span>
                <div key={status}>
                    <h2 className="ob-headline mx-auto mt-5 max-w-[22ch] text-[30px] font-semibold leading-[1.1] tracking-[-0.035em] text-fg-primary xl:text-[34px]">
                        {headline.title}
                    </h2>
                    <p
                        className="ob-headline mx-auto mt-3 max-w-[44ch] text-sm leading-relaxed text-fg-tertiary"
                        style={{ "--ob-delay": "90ms" } as CSSProperties}
                    >
                        {headline.body}
                    </p>
                </div>
            </header>

            {/* ── Jobak ⟷ provider ─────────────────────────────── */}
            <div className="relative flex flex-1 items-center justify-center px-10">
                {/* Rings behind, as on the job search panel. */}
                {[130, 200, 270].map((r) => (
                    <span
                        key={r}
                        className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-dashed border-white/6"
                        style={{ width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r }}
                    />
                ))}

                <div className="relative flex w-full max-w-sm items-center justify-between">
                    <Node active={checking} glow={connected} label="Jobak">
                        <JobakMark size={34} />
                    </Node>

                    <svg className="absolute inset-x-[72px] top-1/2 h-2 -translate-y-1/2 overflow-visible" preserveAspectRatio="none">
                        <line
                            x1="0"
                            y1="4"
                            x2="100%"
                            y2="4"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray={connected ? undefined : "6 8"}
                            className={cn(
                                "transition-[stroke] duration-500",
                                lineClass,
                                (checking || status === "chosen") && "ob-dash",
                            )}
                            style={{ "--ob-dash": checking ? "0.6s" : "2.4s" } as CSSProperties}
                        />
                    </svg>

                    {/* The result, on the line between them. */}
                    {(connected || failed) && (
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                            {connected && <span className="ob-ripple absolute inset-0 rounded-full bg-accent/40" />}
                            <span
                                className={cn(
                                    "ob-pop relative flex size-9 items-center justify-center rounded-full",
                                    connected ? "bg-accent text-[#06210f]" : "bg-status-rose text-white",
                                )}
                            >
                                {connected ? <Check className="size-4.5" strokeWidth={3} /> : <X className="size-4.5" strokeWidth={3} />}
                            </span>
                        </span>
                    )}

                    <Node
                        active={checking}
                        glow={connected}
                        empty={!provider}
                        label={provider ? PROVIDER_INFO[provider].name : "Your AI"}
                    >
                        {provider ? (
                            <span key={provider} className="ob-pop flex">
                                <AiProviderMark provider={provider} className="size-9" />
                            </span>
                        ) : (
                            <Sparkles className="size-6 text-fg-quaternary" />
                        )}
                    </Node>
                </div>

            </div>

            {/* ── What it does, and the promise about the key ─────── */}
            <div className="relative z-10 mx-8 mb-8 rounded-[20px] border border-white/8 bg-[#121415]/90 p-5 xl:mx-12">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.06em] text-fg-quaternary">What your AI does in Jobak</p>
                <ul className="space-y-2.5">
                    {USES.map(({ icon: Icon, text }) => (
                        <li key={text} className="flex items-start gap-2.5 text-[13px] leading-snug text-fg-secondary">
                            <Icon className="mt-0.5 size-3.5 shrink-0 text-accent" />
                            {text}
                        </li>
                    ))}
                </ul>
                <p className="mt-4 flex items-start gap-2.5 border-t border-white/6 pt-4 text-[12px] leading-snug text-fg-tertiary">
                    <Lock className="mt-0.5 size-3.5 shrink-0" />
                    Your key is encrypted before it's stored and only ever used for your own requests.
                </p>
            </div>
        </div>
    );
}

/** One end of the connection: a round tile that pulses while checking and glows once connected. */
function Node({
    children,
    label,
    active,
    glow,
    empty,
}: {
    children: React.ReactNode;
    label: string;
    active?: boolean;
    glow?: boolean;
    empty?: boolean;
}) {
    return (
        <span className="relative z-10 flex size-[72px] shrink-0 items-center justify-center">
            {active && <span className="ob-ripple absolute inset-0 rounded-full bg-accent/25" />}
            <span
                className={cn(
                    "relative flex size-full items-center justify-center rounded-full border bg-[#16191a] transition-[border-color,box-shadow] duration-500",
                    empty ? "border-dashed border-white/15" : "border-white/12",
                    glow && "border-accent/60 shadow-[0_0_40px_-6px_oklch(0.82_0.2_145/0.6)]",
                )}
            >
                {children}
            </span>
            <span
                key={label}
                className="ob-headline absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap text-[12px] text-fg-tertiary"
            >
                {label}
            </span>
        </span>
    );
}
