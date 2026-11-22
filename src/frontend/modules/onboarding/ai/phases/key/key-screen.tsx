"use client";

import { useId, useState, type CSSProperties } from "react";
import { Check, ExternalLink, Eye, EyeOff, ShieldCheck } from "lucide-react";

import { cn } from "@/frontend/shared/lib";

import { AiProviderMark } from "../../ai-provider-marks";
import { checkKeyFormat, keyRules } from "../../provider-keys";
import type { AiProvider } from "../../../types/onboarding.types";
import { PROVIDER_INFO } from "../../providers";

const rise = (i: number) => ({ "--i": i }) as CSSProperties;

/** The key form's id, so the footer's Verify button can submit it from outside. */
export const KEY_FORM_ID = "ai-key-form";

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
