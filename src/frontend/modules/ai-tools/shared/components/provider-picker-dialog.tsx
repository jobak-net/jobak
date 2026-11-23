"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { KeyRound, Loader2, X } from "lucide-react";

import { AiProviderMark, PROVIDER_INFO, type AiProvider } from "@/frontend/modules/onboarding";
import { cn } from "@/frontend/shared/lib";
import { Button } from "@/frontend/shared/ui";
import { findAiModel } from "@/shared/ai";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";
import { SETTINGS_HREF } from "@/shared/routes";

/** The model a provider runs for this user: their pick, else the default — as Settings names it. */
function modelLabel(ai: AiSettingsResponse, provider: AiProvider): string {
    const id = ai.models[provider] ?? ai.defaults[provider];
    return findAiModel(provider, id)?.label ?? id;
}

/**
 * Asks which saved AI key runs this tool, before it runs. Shows only the
 * providers the user has a key for, each with the model it will use; the one
 * in use is preselected. Shared by the AI tools.
 *
 * A native `<dialog>` opened with `showModal()`: focus moves in and stays in,
 * Escape and a click on the backdrop close it, and the page behind is inert.
 */
export function ProviderPickerDialog({
    open,
    ai,
    actionLabel,
    pending,
    onConfirm,
    onClose,
}: {
    open: boolean;
    ai: AiSettingsResponse;
    /** The button, finished with the provider's name: "Write with" → "Write with Groq". */
    actionLabel: string;
    pending: boolean;
    onConfirm: (provider: AiProvider) => void;
    onClose: () => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [picked, setPicked] = useState<AiProvider | null>(ai.preferred);
    const chosen = picked && ai.connected.includes(picked) ? picked : (ai.connected[0] ?? null);

    useEffect(() => {
        const element = dialog.current;
        if (!element) return;
        if (open && !element.open) element.showModal();
        if (!open && element.open) element.close();
    }, [open]);

    return (
        <dialog
            ref={dialog}
            aria-labelledby="provider-picker-title"
            onCancel={(event) => {
                event.preventDefault(); // Escape: let the parent decide, so state and DOM agree
                if (!pending) onClose();
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget && !pending) onClose(); // the backdrop
            }}
            className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-hero border border-border-standard bg-bg-panel p-0 text-fg-primary shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] backdrop:bg-black/60"
        >
            <div className="p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 id="provider-picker-title" className="text-lg font-semibold tracking-[-0.02em]">
                            Which AI should write it?
                        </h2>
                        <p className="mt-1 text-[13px] leading-relaxed text-fg-tertiary">
                            It runs on your own key, with the model you chose for it in Settings.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={pending}
                        aria-label="Close"
                        className="-mr-2 -mt-1 rounded-control p-1.5 text-fg-tertiary hover:bg-white/5 hover:text-fg-primary"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {ai.connected.length === 0 ? (
                    <p className="mt-6 rounded-card border border-border-standard p-4 text-[13px] text-fg-secondary">
                        No AI key saved yet.{" "}
                        <Link href={SETTINGS_HREF} className="font-medium text-accent-text underline-offset-4 hover:underline">
                            Add one in Settings
                        </Link>
                        .
                    </p>
                ) : (
                    <div role="radiogroup" aria-label="AI provider" className="mt-6 space-y-2.5">
                        {ai.connected.map((provider, i) => {
                            const isOn = provider === chosen;
                            return (
                                <button
                                    key={provider}
                                    type="button"
                                    role="radio"
                                    aria-checked={isOn}
                                    disabled={pending}
                                    onClick={() => setPicked(provider)}
                                    style={{ "--i": i } as CSSProperties}
                                    className={cn(
                                        "ob-rise flex w-full items-center gap-3.5 rounded-card border p-3.5 text-left transition-[background-color,border-color] duration-300",
                                        isOn ? "border-accent/45 bg-accent/6" : "border-border-standard bg-white/2 hover:border-border-strong",
                                    )}
                                >
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-control border border-white/8 bg-[#16191a]">
                                        <AiProviderMark provider={provider} className="size-5" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="text-[15px] font-medium">{PROVIDER_INFO[provider].name}</span>
                                            {provider === ai.preferred && (
                                                <span className="rounded-full bg-accent/14 px-2 py-0.5 text-[11px] font-medium text-accent-text">
                                                    In use
                                                </span>
                                            )}
                                        </span>
                                        <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-fg-tertiary">
                                            <KeyRound className="size-3.5 shrink-0" /> {modelLabel(ai, provider)}
                                        </span>
                                    </span>
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            "flex size-4.5 shrink-0 items-center justify-center rounded-full border",
                                            isOn ? "border-accent" : "border-border-strong",
                                        )}
                                    >
                                        {isOn && <span className="size-2 rounded-full bg-accent" />}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <Link href={SETTINGS_HREF} className="text-[13px] text-fg-tertiary underline-offset-4 hover:text-fg-primary hover:underline">
                        Manage keys
                    </Link>
                    <div className="flex gap-2">
                        <Button variant="quiet" onClick={onClose} disabled={pending}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={() => chosen && onConfirm(chosen)} disabled={!chosen || pending}>
                            {pending && <Loader2 className="animate-spin" />}
                            {chosen ? `${actionLabel} ${PROVIDER_INFO[chosen].name}` : actionLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </dialog>
    );
}
