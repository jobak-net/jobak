"use client";

import { Check, CircleAlert, Trash2 } from "lucide-react";

import { Button } from "@/frontend/shared/ui";

import { LIVEKIT_STORAGE_BLOCKED_MESSAGE, useLiveKitSettings } from "../hooks/use-livekit-settings";
import { projectHost } from "../lib/livekit-settings";
import { LiveKitSetupForm } from "./livekit-setup-form";

/** The last 4 characters only: the token server ID lets anyone start calls on the user's account. */
const masked = (value: string) => `••••${value.slice(-4)}`;

/** Settings › Interview practice: what's connected, Remove, and the setup form to change it. */
export function LiveKitSettingsPanel({ accountId }: { accountId: string }) {
    const livekit = useLiveKitSettings(accountId);

    return (
        <div className="space-y-8">
            <div className="space-y-2 text-[13px] leading-relaxed text-fg-tertiary">
                <p>
                    Interview practice calls you with an AI interviewer that runs on your own LiveKit account. Calls use your LiveKit
                    credit.
                </p>
                <p className="text-fg-secondary">This setup stays in this browser. It never reaches Jobak&apos;s server.</p>
            </div>

            {livekit.status === "saved" && livekit.settings && (
                <div className="flex flex-wrap items-center gap-3 rounded-card border border-accent/35 bg-accent/6 p-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                        <Check className="size-4" />
                    </span>
                    <p className="min-w-0 flex-1 text-sm">
                        <span className="block font-medium text-fg-primary">Interviewer: {livekit.settings.agentName}</span>
                        {projectHost(livekit.settings.serverUrl) && (
                            <span className="block text-[13px] text-fg-tertiary">Project {projectHost(livekit.settings.serverUrl)}</span>
                        )}
                        <span className="block text-[13px] text-fg-tertiary">Token server {masked(livekit.settings.tokenServerId)}</span>
                    </p>
                    <Button variant="quiet" size="sm" type="button" onClick={livekit.remove}>
                        <Trash2 /> Remove
                    </Button>
                </div>
            )}

            {livekit.status === "blocked" ? (
                <p role="alert" className="flex items-start gap-2 rounded-card border border-status-amber/30 bg-status-amber/6 p-4 text-[13px] text-fg-secondary">
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-status-amber" />
                    {LIVEKIT_STORAGE_BLOCKED_MESSAGE} Allow site data for Jobak, or use a normal (not private) window.
                </p>
            ) : (
                <LiveKitSetupForm accountId={accountId} />
            )}
        </div>
    );
}
