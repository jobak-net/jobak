"use client";

import { useState, type CSSProperties } from "react";
import { ArrowRightLeft, CircleAlert, KeyRound, Loader2, Trash2, TriangleAlert } from "lucide-react";

import { AiProviderMark, PROVIDER_INFO, type AiProvider } from "@/frontend/modules/onboarding";
import { cn } from "@/frontend/shared/lib";
import { Button } from "@/frontend/shared/ui";

import { removeKeyImpact } from "../lib/remove-key-impact";

const nameOf = (provider: AiProvider) => PROVIDER_INFO[provider].name;

/**
 * The keys the user has saved, one row each: which one the AI tools use, a
 * switch to any other, and remove — which first says, in the row, what
 * removing it changes (`removeKeyImpact`), and only then removes.
 */
export function SavedKeys({
    connected,
    preferred,
    busy,
    pendingFor,
    error,
    onPrefer,
    onRemove,
}: {
    /** Preferred first, the API's order. */
    connected: AiProvider[];
    preferred: AiProvider | null;
    busy: boolean;
    pendingFor: AiProvider | null | undefined;
    error: string | null;
    onPrefer: (provider: AiProvider) => void;
    onRemove: (provider: AiProvider, onDone: () => void) => void;
}) {
    /** The row asking "are you sure?", if any. One at a time. */
    const [confirming, setConfirming] = useState<AiProvider | null>(null);

    if (connected.length === 0) {
        return (
            <div className="flex items-start gap-3 rounded-card border border-status-amber/35 bg-status-amber/6 p-4">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-status-amber" />
                <p className="text-[13px] leading-relaxed text-fg-secondary">
                    <span className="font-medium text-fg-primary">No AI key saved.</span> Match scoring and the AI tools need
                    one. Pick a provider below and add its key.
                </p>
            </div>
        );
    }

    return (
        <div>
            <ul className="space-y-2.5">
                {connected.map((provider, i) => {
                    const inUse = provider === preferred;
                    const pending = pendingFor === provider;
                    const impact = confirming === provider ? removeKeyImpact(provider, connected, nameOf) : null;
                    return (
                        <li
                            key={provider}
                            className={cn(
                                "ob-rise rounded-card border p-4 transition-[background-color,border-color] duration-300",
                                inUse ? "border-accent/45 bg-accent/6" : "border-border-standard bg-white/2",
                            )}
                            style={{ "--i": i } as CSSProperties}
                        >
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-control border border-white/8 bg-[#16191a]">
                                    <AiProviderMark provider={provider} className="size-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex flex-wrap items-center gap-2">
                                        <span className="text-[15px] font-medium text-fg-primary">{nameOf(provider)}</span>
                                        {inUse && (
                                            <span className="rounded-full bg-accent/14 px-2 py-0.5 text-[11px] font-medium text-accent-text">
                                                In use
                                            </span>
                                        )}
                                    </span>
                                    <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-fg-tertiary">
                                        <KeyRound className="size-3.5" /> Key saved
                                    </span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    {pending && <Loader2 className="size-4 animate-spin text-fg-tertiary" aria-label="Saving" />}
                                    {!inUse && (
                                        <Button variant="secondary" size="sm" disabled={busy} onClick={() => onPrefer(provider)}>
                                            <ArrowRightLeft /> Use this one
                                        </Button>
                                    )}
                                    <Button
                                        variant="quiet"
                                        size="sm"
                                        disabled={busy}
                                        aria-expanded={confirming === provider}
                                        onClick={() => setConfirming(confirming === provider ? null : provider)}
                                    >
                                        <Trash2 /> Remove
                                    </Button>
                                </span>
                            </div>

                            {impact && (
                                <div
                                    role="alertdialog"
                                    aria-labelledby={`remove-${provider}-title`}
                                    className={cn(
                                        "ob-pop mt-4 rounded-control border p-4",
                                        impact.kind === "stops"
                                            ? "border-status-rose/40 bg-status-rose/8"
                                            : "border-status-amber/35 bg-status-amber/6",
                                    )}
                                >
                                    <p id={`remove-${provider}-title`} className="flex items-center gap-2 text-sm font-medium text-fg-primary">
                                        <TriangleAlert
                                            className={cn("size-4 shrink-0", impact.kind === "stops" ? "text-status-rose" : "text-status-amber")}
                                        />
                                        {impact.title}
                                    </p>
                                    <p className="mt-1.5 text-[13px] leading-relaxed text-fg-secondary">{impact.body}</p>
                                    {impact.affected.length > 0 && (
                                        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[13px] text-fg-secondary">
                                            {impact.affected.map((feature) => (
                                                <li key={feature}>{feature}</li>
                                            ))}
                                        </ul>
                                    )}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            disabled={busy}
                                            onClick={() => onRemove(provider, () => setConfirming(null))}
                                        >
                                            {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
                                            Remove key
                                        </Button>
                                        <Button variant="quiet" size="sm" disabled={busy} onClick={() => setConfirming(null)}>
                                            Keep it
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
            {error && (
                <p role="alert" className="mt-3 flex items-center gap-1.5 text-[13px] text-status-amber">
                    <CircleAlert className="size-3.5" /> {error}
                </p>
            )}
        </div>
    );
}
