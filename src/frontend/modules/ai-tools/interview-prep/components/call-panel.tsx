"use client";

import { useEffect, useState } from "react";
import { CircleAlert, ClipboardCheck, Loader2, Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";

import { Button } from "@/frontend/shared/ui";
import { cn } from "@/frontend/shared/lib";

import { callStatusText, elapsedText } from "../lib/call-copy";
import type { CallState } from "../lib/call-state";

/** Ticks once a second while `running`, for the call timer. */
function useNow(running: boolean): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!running) return;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [running]);
    return now;
}

/** The call's status line, timer, Mute, "Finish and get feedback" and End. */
export function CallPanel({
    state,
    onFinish,
    onEnd,
    onMute,
    onEnableAudio,
}: {
    state: CallState;
    /** Ask the interviewer to wrap up and send its evaluation. */
    onFinish: () => void;
    onEnd: () => void;
    onMute: (on: boolean) => void;
    /** The browser blocked the interviewer's audio: a click lets it play. */
    onEnableAudio: () => void;
}) {
    const inCall = state.phase === "waiting-agent" || state.phase === "live" || state.phase === "finishing";
    const finishing = state.phase === "finishing";
    const starting = state.phase === "mic" || state.phase === "connecting";
    const now = useNow(inCall);
    if (state.phase === "idle") return null;

    const problem = state.phase === "ended" && state.end !== "user" && state.end !== "evaluated" && state.end !== "finished";
    const speaking = state.phase === "live" && state.agent === "speaking";

    return (
        <section aria-live="polite" className="flex flex-wrap items-center gap-3 rounded-card border border-border-subtle bg-white/2 p-4">
            {finishing ? (
                <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-accent-text" />
            ) : (
                <span
                    aria-hidden="true"
                    className={cn(
                        "size-2.5 shrink-0 rounded-full",
                        problem ? "bg-status-amber" : inCall ? "bg-accent" : "bg-fg-quaternary",
                        speaking && "animate-pulse",
                    )}
                />
            )}
            <p className={cn("min-w-0 flex-1 text-sm", problem ? "text-status-amber" : "text-fg-primary")}>
                {problem && <CircleAlert className="mr-1.5 inline size-4 align-[-3px]" />}
                {callStatusText(state)}
            </p>
            {inCall && state.startedAt !== null && (
                <span className="font-medium tabular-nums text-fg-secondary">{elapsedText(now - state.startedAt)}</span>
            )}
            {(inCall || starting) && (
                <div className="flex flex-wrap gap-2">
                    {inCall && state.audioBlocked && (
                        <Button variant="primary" size="sm" onClick={onEnableAudio}>
                            <Volume2 /> Turn on the interviewer&apos;s voice
                        </Button>
                    )}
                    {inCall && !finishing && (
                        <Button variant="secondary" size="sm" onClick={() => onMute(!state.muted)} aria-pressed={state.muted}>
                            {state.muted ? <MicOff /> : <Mic />}
                            {state.muted ? "Unmute" : "Mute"}
                        </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={onEnd}>
                        <PhoneOff /> {finishing ? "Skip feedback" : state.phase === "live" ? "End without feedback" : "End interview"}
                    </Button>
                    {state.phase === "live" && (
                        <Button variant="primary" size="sm" onClick={onFinish}>
                            <ClipboardCheck /> Finish and get feedback
                        </Button>
                    )}
                </div>
            )}
        </section>
    );
}
