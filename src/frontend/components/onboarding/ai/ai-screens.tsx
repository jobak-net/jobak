"use client";

import { useId, useState, type CSSProperties } from "react";
import { Check, ExternalLink, Eye, EyeOff, ShieldCheck } from "lucide-react";

import { AiProviderMark } from "@/frontend/components/shared/ai-provider-marks";
import { checkKeyFormat, keyRules } from "@/frontend/lib/configs/provider-keys";
import { cn } from "@/frontend/lib/utils/utils";
import type { AiProvider } from "@/frontend/types/on-boarding";

import { PROVIDER_INFO, PROVIDER_ORDER } from "./providers";

const rise = (i: number) => ({ "--i": i }) as CSSProperties;

/** The key form's id, so the footer's Verify button can submit it from outside. */
export const KEY_FORM_ID = "ai-key-form";

// ── 2. Choosing a provider ───────────────────────────────────────────────

export function ChooseScreen({
    selected,
    onSelect,
}: {
    selected: AiProvider | null;
    onSelect: (provider: AiProvider) => void;
}) {
    return (
        <div role="radiogroup" aria-label="AI provider" className="grid gap-3 sm:grid-cols-2">
            {PROVIDER_ORDER.map((provider, i) => {
                const info = PROVIDER_INFO[provider];
                const isOn = selected === provider;
                return (
                    <button
                        key={provider}
                        type="button"
                        role="radio"
                        aria-checked={isOn}
                        onClick={() => onSelect(provider)}
                        style={rise(i)}
                        className={cn(
                            "ob-rise group relative flex flex-col items-start gap-4 rounded-card border p-4 pb-5 text-left transition-[background-color,border-color,box-shadow,scale] duration-300 active:scale-[0.985]",
                            isOn
                                ? "border-accent/55 bg-accent/7 shadow-[0_0_0_1px_oklch(0.82_0.2_145/0.25)_inset,0_18px_40px_-20px_oklch(0.82_0.2_145/0.55)]"
                                : "border-border-standard bg-white/2 hover:border-border-strong hover:bg-white/4",
                        )}
                    >
                        <span className="flex size-11 items-center justify-center rounded-control border border-white/8 bg-[#16191a]">
                            <AiProviderMark provider={provider} className="size-6" />
                        </span>
                        <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                                <span className="text-[15px] font-medium text-fg-primary">{info.name}</span>
                                {info.recommended && (
                                    <span className="rounded-full bg-accent/14 px-2 py-0.5 text-[11px] font-medium text-accent-text">
                                        Recommended
                                    </span>
                                )}
                            </span>
                            <span className="mt-1 block text-[13px] leading-relaxed text-fg-tertiary">{info.tagline}</span>
                            <span
                                className={cn(
                                    "mt-3 inline-block rounded-full border px-2 py-0.5 text-[11px]",
                                    info.free ? "border-accent/25 text-accent-text" : "border-border-standard text-fg-tertiary",
                                )}
                            >
                                {info.pricing}
                            </span>
                        </span>
                        <span
                            aria-hidden="true"
                            className={cn(
                                "absolute right-3.5 top-3.5 flex size-4.5 items-center justify-center rounded-full border transition-colors duration-300",
                                isOn ? "border-accent" : "border-border-strong",
                            )}
                        >
                            {isOn && <span className="ob-pop size-2 rounded-full bg-accent" />}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ── 3. The key ───────────────────────────────────────────────────────────

/**
 * Where to get the key, and the field to paste it into.
 *
 * The format is checked as the user types (`checkKeyFormat`, the same rule
 * the server applies), so the wrong provider's key or a half-paste is caught
 * before anything is sent. A format problem is only shown once the value is
 * long enough to be a real attempt, or the field is left — not on the first
 * character.
 */
export function KeyScreen({
    provider,
    value,
    onChange,
    error,
    checking,
    onSubmit,
}: {
    provider: AiProvider;
    value: string;
    onChange: (value: string) => void;
    error: string | null;
    checking: boolean;
    onSubmit: () => void;
}) {
    const id = useId();
    const info = PROVIDER_INFO[provider];
    const [visible, setVisible] = useState(false);
    const [touched, setTouched] = useState(false);

    const format = checkKeyFormat(provider, value);
    const attempted = touched || value.trim().length >= keyRules[provider].minLength;
    const formatProblem = value && !format.ok && attempted ? format.reason : null;

    return (
        <div className="space-y-8">
            <ol className="ob-rise space-y-2.5" style={rise(0)} aria-label={`How to get a ${info.name} key`}>
                {info.keySteps.map((step, i) => (
                    <li key={step} className="flex items-start gap-3 text-sm text-fg-secondary">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-[11px] tabular-nums text-fg-tertiary">
                            {i + 1}
                        </span>
                        <span className="pt-px">{step}</span>
                    </li>
                ))}
            </ol>

            <a
                href={info.keyUrl}
                target="_blank"
                rel="noreferrer"
                style={rise(1)}
                className="ob-rise group flex items-center gap-3 rounded-card border border-border-standard bg-white/2 p-3.5 transition-colors hover:border-border-strong hover:bg-white/4"
            >
                <span className="flex size-9 items-center justify-center rounded-control border border-white/8 bg-[#16191a]">
                    <AiProviderMark provider={provider} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-fg-primary">Open {info.name}</span>
                    <span className="block truncate font-mono text-[12px] text-fg-tertiary">{info.keyUrlLabel}</span>
                </span>
                <ExternalLink className="size-4 text-fg-quaternary transition-colors group-hover:text-fg-primary" />
            </a>

            {/* Submitted by Enter, or by the footer's Verify button through form="ai-key-form". */}
            <form
                id={KEY_FORM_ID}
                className="ob-rise"
                style={rise(2)}
                onSubmit={(event) => {
                    event.preventDefault();
                    setTouched(true);
                    if (format.ok && !checking) onSubmit();
                }}
            >
                <label htmlFor={id} className="text-sm font-medium text-fg-secondary">
                    {info.name} API key
                </label>
                <div className="relative mt-2.5">
                    <input
                        id={id}
                        type={visible ? "text" : "password"}
                        value={value}
                        onChange={(event) => onChange(event.target.value.trim())}
                        onBlur={() => setTouched(true)}
                        placeholder={info.placeholder}
                        autoComplete="off"
                        spellCheck={false}
                        autoCapitalize="off"
                        disabled={checking}
                        aria-invalid={Boolean(formatProblem || error)}
                        aria-describedby={`${id}-status`}
                        className={cn(
                            "h-11 w-full rounded-control border bg-bg-panel pl-3.5 pr-11 font-mono text-[13px] text-fg-primary outline-none transition-colors placeholder:text-fg-quaternary disabled:opacity-60",
                            formatProblem || error
                                ? "border-status-rose/60 focus:border-status-rose"
                                : format.ok
                                  ? "border-accent/45 focus:border-accent/70"
                                  : "border-border-standard focus:border-accent/45",
                        )}
                    />
                    <button
                        type="button"
                        onClick={() => setVisible((v) => !v)}
                        aria-label={visible ? "Hide key" : "Show key"}
                        className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-control text-fg-tertiary transition-colors hover:bg-white/5 hover:text-fg-primary"
                    >
                        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                </div>

                <p id={`${id}-status`} className="mt-2 min-h-5 text-[13px]" aria-live="polite">
                    {error ? (
                        <span key={error} role="alert" className="ob-shake inline-block text-status-rose">
                            {error}
                        </span>
                    ) : formatProblem ? (
                        <span className="text-status-rose">{formatProblem}</span>
                    ) : format.ok ? (
                        <span className="inline-flex items-center gap-1.5 text-accent-text">
                            <Check className="size-3.5" /> Looks like a {info.name} key
                        </span>
                    ) : null}
                </p>

                <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-fg-quaternary">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                    Checked with {info.name} before it&apos;s saved. Stored encrypted, never shown again in full.
                </p>
            </form>
        </div>
    );
}

// ── 4. Connected ─────────────────────────────────────────────────────────

export function ConnectedScreen({ provider }: { provider: AiProvider }) {
    const info = PROVIDER_INFO[provider];
    return (
        <div className="space-y-3">
            {[
                `${info.name} scores every job Jobak finds against your preferences`,
                "Your first matches appear on the dashboard as they're found",
                "Add another provider or replace the key any time in Settings",
            ].map((text, i) => (
                <div
                    key={text}
                    className="ob-rise flex items-start gap-3 rounded-control border border-border-subtle bg-white/2 px-4 py-3 text-sm text-fg-secondary"
                    style={rise(i)}
                >
                    <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                    {text}
                </div>
            ))}
        </div>
    );
}
