"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { JobakLogo } from "@/frontend/components/shared/jobak-logo";
import { Button } from "@/frontend/components/ui";
import { DASHBOARD_HREF } from "@/shared/routes";
import { checkKeyFormat } from "@/frontend/lib/configs/provider-keys";
import { cn } from "@/frontend/lib/utils/utils";
import type { AiProvider } from "@/frontend/types/on-boarding";

import { ChooseScreen, ConnectedScreen, KEY_FORM_ID, KeyScreen } from "./ai-screens";
import { PreparingScreen } from "./setup-screen";
import { ConnectionPanel, type ConnectionStatus } from "./connection-panel";
import { previewVerifyKey } from "./preview-verify";
import { PROVIDER_INFO } from "./providers";

type Phase = "preparing" | "choose" | "key" | "connected";

/** The three steps the progress bar counts; "preparing" comes before them. */
const STEPS: Exclude<Phase, "preparing">[] = ["choose", "key", "connected"];

/**
 * The second onboarding: connecting the AI that scores jobs.
 *
 * Required — there is no skip and the logo is not a link — because without a
 * model Jobak can find jobs but not rank them, which is the product.
 *
 * preparing → choose a provider → paste and verify the key → connected.
 * Same layout and motion as the job questions: the question on the left, a
 * live panel on the right showing Jobak and the chosen provider connecting.
 *
 * DESIGN STAGE: verification is `previewVerifyKey`, a stand-in that checks
 * the format only and saves nothing. The backend (verify with the provider,
 * encrypt, store, then gate the dashboard on it) is the next conversation.
 */
export function AiSetupFlow({ summary, firstName }: { summary: string; firstName: string | null }) {
    const router = useRouter();
    const [phase, setPhase] = useState<Phase>("preparing");
    const [provider, setProvider] = useState<AiProvider | null>(null);
    /** Kept per provider, so switching to compare and back doesn't lose a paste. */
    const [keys, setKeys] = useState<Partial<Record<AiProvider, string>>>({});
    const [error, setError] = useState<string | null>(null);
    const [checking, startChecking] = useTransition();
    const scroller = useRef<HTMLElement>(null);

    const key = provider ? (keys[provider] ?? "") : "";
    const stepIndex = phase === "preparing" ? -1 : STEPS.indexOf(phase);

    // Which way the step changed, so it slides in from that side.
    const [shown, setShown] = useState({ phase, index: stepIndex, dir: "forward" as "forward" | "back" });
    if (shown.phase !== phase) setShown({ phase, index: stepIndex, dir: stepIndex >= shown.index ? "forward" : "back" });

    useEffect(() => {
        scroller.current?.scrollTo({ top: 0 });
        window.scrollTo({ top: 0 });
    }, [phase]);

    const status: ConnectionStatus =
        phase === "connected" ? "connected" : checking ? "checking" : error ? "failed" : provider ? "chosen" : "waiting";

    function verify() {
        if (!provider) return;
        setError(null);
        startChecking(async () => {
            const result = await previewVerifyKey(provider, key);
            if (result.ok) setPhase("connected");
            else setError(result.message);
        });
    }

    // ── The bridge screen: full width, centred, before the two columns. ──
    if (phase === "preparing") {
        return (
            <div className="relative flex min-h-dvh flex-col bg-(--bg-canvas)">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-0 size-200 -translate-x-1/2 -translate-y-1/3 bg-[radial-gradient(closest-side,oklch(0.82_0.2_145/0.1),transparent)]"
                />
                <header className="relative z-10 px-6 pt-6 sm:px-10 lg:px-14">
                    <JobakLogo showText href="" />
                </header>
                <main className="relative z-10 flex flex-1 items-center px-6 py-12">
                    <PreparingScreen summary={summary} onContinue={() => setPhase("choose")} />
                </main>
            </div>
        );
    }

    const info = provider ? PROVIDER_INFO[provider] : null;
    const copy = {
        choose: {
            eyebrow: "Last step",
            title: "Which AI should Jobak use?",
            description: "Pick one to start. You can add others or switch later in Settings.",
        },
        key: {
            eyebrow: "Last step",
            title: `Add your ${info?.name ?? ""} API key`,
            description: `Create a key on your ${info?.name ?? ""} account and paste it here. It takes about a minute.`,
        },
        connected: {
            eyebrow: "All set",
            title: `You're all set${firstName ? `, ${firstName}` : ""}`,
            description: `${info?.name ?? "Your AI"} is connected. Jobak is preparing your first matches.`,
        },
    }[phase];

    return (
        <div className="relative grid min-h-dvh bg-(--bg-canvas) lg:h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-rows-1 lg:overflow-hidden">
            {/* ── Left: the question ─────────────────────────────────── */}
            <div className="relative flex min-h-dvh flex-col lg:min-h-0">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-56 -top-64 size-180 bg-[radial-gradient(closest-side,oklch(0.82_0.2_145/0.09),transparent)]"
                />

                <header className="relative z-10 px-6 pt-6 sm:px-10 lg:px-14">
                    <div className="flex items-center justify-between">
                        {/* Not a link: this step can't be skipped. */}
                        <JobakLogo showText href="" />
                        <p className="text-[13px] text-fg-tertiary">Connect your AI</p>
                    </div>
                    <div
                        role="progressbar"
                        aria-label="AI setup progress"
                        aria-valuemin={0}
                        aria-valuemax={STEPS.length}
                        aria-valuenow={phase === "connected" ? STEPS.length : stepIndex}
                        className="mt-5 flex gap-1.5"
                    >
                        {STEPS.map((step, i) => {
                            const complete = i < stepIndex || phase === "connected";
                            return (
                                <span
                                    key={step}
                                    className={cn(
                                        "relative h-1 flex-1 overflow-hidden rounded-full transition-colors duration-500",
                                        i === stepIndex && !complete ? "bg-white/18" : "bg-white/7",
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "absolute inset-0 origin-left rounded-full bg-accent transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                                            complete ? "scale-x-100" : "scale-x-0",
                                        )}
                                    />
                                </span>
                            );
                        })}
                    </div>
                </header>

                <main ref={scroller} className="relative z-10 flex-1 px-6 sm:px-10 lg:overflow-y-auto lg:px-14">
                    <div className="mx-auto w-full max-w-xl py-10 lg:py-14">
                        <div key={phase} className="ob-step" data-dir={shown.dir}>
                            <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-accent-text">
                                {copy.eyebrow}
                            </p>
                            <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.04em] text-fg-primary sm:text-[38px]">
                                {copy.title}
                            </h1>
                            <p className="mt-3 max-w-[56ch] text-sm leading-relaxed text-fg-tertiary">{copy.description}</p>

                            <div className="mt-9">
                                {phase === "choose" && (
                                    <ChooseScreen
                                        selected={provider}
                                        onSelect={(next) => {
                                            setProvider(next);
                                            setError(null);
                                        }}
                                    />
                                )}
                                {phase === "key" && provider && (
                                    <KeyScreen
                                        provider={provider}
                                        value={key}
                                        onChange={(value) => {
                                            setKeys((all) => ({ ...all, [provider]: value }));
                                            setError(null);
                                        }}
                                        error={error}
                                        checking={checking}
                                        onSubmit={verify}
                                    />
                                )}
                                {phase === "connected" && provider && <ConnectedScreen provider={provider} />}
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="sticky bottom-0 z-20 border-t border-border-subtle bg-(--bg-canvas)/85 px-6 py-4 backdrop-blur-md sm:px-10 lg:static lg:border-t-0 lg:bg-transparent lg:px-14 lg:pb-8 lg:backdrop-blur-none">
                    <div className="mx-auto flex w-full max-w-xl items-center gap-3">
                        {phase === "key" && (
                            <Button variant="secondary" onClick={() => setPhase("choose")} disabled={checking}>
                                <ArrowLeft /> Change provider
                            </Button>
                        )}

                        {phase === "choose" && (
                            <Button variant="primary" onClick={() => setPhase("key")} disabled={!provider} className="group">
                                Continue{info ? ` with ${info.name}` : ""}
                                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                            </Button>
                        )}
                        {phase === "key" && provider && (
                            <Button
                                variant="primary"
                                type="submit"
                                form={KEY_FORM_ID}
                                disabled={checking || !checkKeyFormat(provider, key).ok}
                            >
                                {checking ? <Loader2 className="animate-spin" /> : <Check />}
                                {checking ? "Checking key" : "Verify and connect"}
                            </Button>
                        )}
                        {phase === "connected" && (
                            <Button variant="primary" onClick={() => router.replace(DASHBOARD_HREF)} className="group">
                                Go to my dashboard
                                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                            </Button>
                        )}
                    </div>
                </footer>
            </div>

            {/* ── Right: Jobak and the provider, connecting ───────────── */}
            <aside className="hidden p-3 pl-0 lg:block">
                <ConnectionPanel provider={provider} status={status} />
            </aside>
        </div>
    );
}
