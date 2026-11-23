"use client";

import type { CSSProperties } from "react";

import { cn } from "@/frontend/shared/lib";
import type { AiProviderId } from "@/shared/ai";

import { modelChoices, type ModelChoice } from "../lib/model-options";

/**
 * Which model runs the AI tools for `provider` — one field of the AI tab's
 * form. Picking only changes the form; the tab's Save sends it, together with
 * a key when one was typed (`useAiConnection`).
 */
export function ModelPicker({
    provider,
    providerName,
    defaultModel,
    value,
    onChange,
    unsaved,
    disabled,
}: {
    provider: AiProviderId;
    providerName: string;
    /** What runs without a pick: this server's default (`AiSettingsResponse.defaults`). */
    defaultModel: string;
    /** The model shown as selected: the unsaved pick, else the saved one, else the default. */
    value: string;
    onChange: (choice: ModelChoice) => void;
    /** The selected model is a pick that isn't saved yet: it's marked so. */
    unsaved?: boolean;
    disabled?: boolean;
}) {
    const choices = modelChoices(provider, defaultModel);

    return (
        <div role="radiogroup" aria-label={`${providerName} model`} className="space-y-2.5">
            {choices.map((choice, i) => {
                const isOn = choice.id === value;
                return (
                    <button
                        key={choice.id}
                        type="button"
                        role="radio"
                        aria-checked={isOn}
                        disabled={disabled}
                        onClick={() => onChange(choice)}
                        style={{ "--i": i } as CSSProperties}
                        className={cn(
                            "ob-rise flex w-full items-start gap-3.5 rounded-card border p-4 text-left transition-[background-color,border-color] duration-300 disabled:opacity-60",
                            isOn ? "border-accent/45 bg-accent/6" : "border-border-standard bg-white/2 hover:border-border-strong",
                        )}
                    >
                        <span
                            aria-hidden="true"
                            className={cn(
                                "mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                                isOn ? "border-accent" : "border-border-strong",
                            )}
                        >
                            {isOn && <span className="ob-pop size-2 rounded-full bg-accent" />}
                        </span>
                        <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                                <span className="text-[15px] font-medium text-fg-primary">{choice.label}</span>
                                {choice.isDefault && (
                                    <span className="rounded-full bg-accent/14 px-2 py-0.5 text-[11px] font-medium text-accent-text">
                                        Default
                                    </span>
                                )}
                                {isOn && unsaved && (
                                    <span className="rounded-full border border-status-amber/40 px-2 py-0.5 text-[11px] font-medium text-status-amber">
                                        Unsaved
                                    </span>
                                )}
                            </span>
                            <span className="mt-0.5 block text-[13px] leading-relaxed text-fg-tertiary">{choice.note}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
