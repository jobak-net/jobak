"use client";

import { useState, type FormEvent } from "react";

import { looksLikeUrl, projectHost } from "../lib/livekit-settings";
import { useLiveKitSettings } from "./use-livekit-settings";

/** The setup's steps, in order: two done in LiveKit Cloud, the last one here. */
export const LIVEKIT_SETUP_STEPS = [
    { id: "token-server", label: "Token server", title: "Turn on the token server" },
    { id: "interviewer", label: "Interviewer", title: "Create the interviewer" },
    { id: "connect", label: "Connect", title: "Paste the ID and the agent name" },
] as const;

const LAST_STEP = LIVEKIT_SETUP_STEPS.length - 1;

/**
 * State for the LiveKit setup wizard: which step is shown, the two values,
 * and Connect. Any step can be opened (what's done in LiveKit can't be
 * checked from here); someone who already has a setup starts on the last
 * step, since changing the ID is why they're back.
 */
export function useLiveKitSetupForm(accountId: string) {
    const livekit = useLiveKitSettings(accountId);
    const [step, setStep] = useState(livekit.status === "saved" ? LAST_STEP : 0);
    const [tokenServerId, setTokenServerIdValue] = useState("");
    const [agentName, setAgentNameValue] = useState(livekit.settings?.agentName ?? "");
    const [saved, setSaved] = useState(false);

    const pastedUrl = looksLikeUrl(tokenServerId);
    const canConnect = Boolean(tokenServerId.trim() && agentName.trim()) && !pastedUrl && !livekit.saving;

    async function submit(event: FormEvent) {
        event.preventDefault();
        // Enter in a field submits even while Connect is disabled.
        if (step !== LAST_STEP || !canConnect) return;
        setSaved(false);
        try {
            await livekit.save({ tokenServerId, agentName });
            setTokenServerIdValue("");
            setSaved(true);
        } catch {
            /* shown from livekit.saveError */
        }
    }

    return {
        livekit,
        step,
        goTo: (next: number) => setStep(Math.min(Math.max(next, 0), LAST_STEP)),
        tokenServerId,
        setTokenServerId: (value: string) => {
            setTokenServerIdValue(value);
            setSaved(false);
        },
        agentName,
        setAgentName: (value: string) => {
            setAgentNameValue(value);
            setSaved(false);
        },
        pastedUrl,
        canConnect,
        saved,
        host: projectHost(livekit.settings?.serverUrl),
        submit,
    };
}
