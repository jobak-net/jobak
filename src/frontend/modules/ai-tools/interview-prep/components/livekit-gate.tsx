"use client";

import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";

import { GuideVideo, LockedFeature } from "@/frontend/shared/components";

import { LIVEKIT_STORAGE_BLOCKED_MESSAGE, useLiveKitSettings } from "../hooks/use-livekit-settings";
import type { LiveKitSettings } from "../lib/livekit-settings";
import { LiveKitSetupForm } from "./livekit-setup-form";

/**
 * Locks interview practice until this browser has a LiveKit setup, and lets
 * the user connect right in the lock's card: once the token server ID checks
 * out, the page unlocks in place. Decided on the client (the setup lives in
 * the browser), with a neutral skeleton until the browser has been read.
 */
export function LiveKitGate({ accountId, preview, children }: { accountId: string; preview: ReactNode; children: (settings: LiveKitSettings) => ReactNode }) {
    const livekit = useLiveKitSettings(accountId);

    if (livekit.status === "loading") {
        return <div aria-busy="true" aria-label="Loading" className="h-120 animate-pulse rounded-3xl border border-border-subtle bg-white/2" />;
    }
    if (livekit.status === "saved" && livekit.settings) return <>{children(livekit.settings)}</>;

    return (
        <LockedFeature
            locked
            feature="interview practice"
            requirement="your LiveKit details"
            description="The interviewer runs on your own LiveKit account, from this browser. Jobak never joins the call or sees what's said."
            action={{
                content:
                    livekit.status === "blocked" ? (
                        <p role="alert" className="flex items-start gap-2 rounded-card border border-status-amber/30 bg-status-amber/6 p-4 text-[13px] text-fg-secondary">
                            <CircleAlert className="mt-0.5 size-4 shrink-0 text-status-amber" />
                            {LIVEKIT_STORAGE_BLOCKED_MESSAGE} Allow site data for Jobak, or use a normal (not private) window.
                        </p>
                    ) : (
                        <LiveKitSetupForm accountId={accountId} variant="compact" />
                    ),
            }}
            note="Kept in this browser only. Calls use your LiveKit account's credit. You can change it in Settings."
            guide={
                <GuideVideo
                    title="Watch the setup"
                    src="/guides/livekit-setup.mp4"
                    poster="/guides/livekit-setup.jpg"
                    captionsSrc="/guides/livekit-setup.vtt"
                    duration="1:59"
                    collapsed
                    // Starts match public/guides/livekit-setup.vtt: cues 1, 5 and 13, less the pause before each.
                    chapters={[
                        { label: "Token server", start: 0 },
                        { label: "Interviewer", start: 26.7 },
                        { label: "Connect and feedback", start: 101.6 },
                    ]}
                    fallback={
                        <p className="text-[13px] leading-relaxed text-fg-tertiary">
                            The video can&apos;t be played here. The three steps below cover the same ground, and take about five
                            minutes in LiveKit Cloud.
                        </p>
                    }
                />
            }
        >
            {preview}
        </LockedFeature>
    );
}
