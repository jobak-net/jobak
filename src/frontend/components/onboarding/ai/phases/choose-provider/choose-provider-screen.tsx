"use client";

import type { CSSProperties } from "react";

import { AiProviderMark } from "@/frontend/components/shared/ai-provider-marks";
import { cn } from "@/frontend/lib/utils/utils";
import type { AiProvider } from "@/frontend/types/on-boarding";

import { PROVIDER_INFO, PROVIDER_ORDER } from "../../providers";

const rise = (i: number) => ({ "--i": i }) as CSSProperties;

/** The providers to pick from, one card each. */
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
