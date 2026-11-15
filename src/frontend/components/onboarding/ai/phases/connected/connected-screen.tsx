"use client";

import type { CSSProperties } from "react";
import { Check } from "lucide-react";

import type { AiProvider } from "@/frontend/types/on-boarding";

import { PROVIDER_INFO } from "../../providers";

const rise = (i: number) => ({ "--i": i }) as CSSProperties;

/** What happens now that the AI is connected. */
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
