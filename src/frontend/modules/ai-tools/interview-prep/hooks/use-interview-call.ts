"use client";

import { useEffect, useReducer, useState } from "react";
import { DisconnectReason, Room, TokenSource, type RemoteTrack } from "livekit-client";

import { callReducer, initialCall } from "../lib/call-state";
import type { InterviewEvaluation } from "../lib/evaluation";
import { createInterviewSession, type RoomLike, type SessionDeps } from "../lib/interview-session";
import type { LiveKitSettings } from "../lib/livekit-settings";
import { applyTranscriptPiece, type TranscriptLine } from "../lib/transcript";

/** Disconnects that end an interview normally: we hung up, or the room closed after it. */
const NORMAL_DISCONNECTS: readonly unknown[] = [DisconnectReason.CLIENT_INITIATED, DisconnectReason.ROOM_DELETED, DisconnectReason.PARTICIPANT_REMOVED];

function browserDeps(settings: LiveKitSettings): SessionDeps {
    return {
        requestMic: async () => {
            const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
            probe.getTracks().forEach((track) => track.stop());
        },
        fetchToken: (options) => TokenSource.developmentTokenServer(settings.tokenServerId).fetch(options),
        createRoom: () => new Room() as unknown as RoomLike,
        setTimer: (fn, ms) => window.setTimeout(fn, ms),
        clearTimer: (handle) => window.clearTimeout(handle as number),
        now: () => Date.now(),
        // livekit-client doesn't play remote audio by itself: each interviewer track gets a hidden <audio>.
        attachAudio: (track) => {
            const remote = track as RemoteTrack;
            const element = remote.attach();
            element.hidden = true;
            document.body.appendChild(element);
            return () => {
                remote.detach(element);
                element.remove();
            };
        },
        isNormalDisconnect: (reason) => NORMAL_DISCONNECTS.includes(reason),
    };
}

/**
 * The page's side of a practice call: the state, transcript and evaluation to
 * show, and start, finish (with feedback), end, mute and "enable audio". The call itself is `createInterviewSession`
 * (lib/interview-session.ts). Leaving the page or closing the tab hangs up and frees the mic.
 *
 * One session per LiveKit setup: the view keys this component by the settings.
 */
export function useInterviewCall(settings: LiveKitSettings) {
    const [state, dispatch] = useReducer(callReducer, initialCall);
    const [lines, setLines] = useState<TranscriptLine[]>([]);
    const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
    const [session] = useState(() =>
        createInterviewSession({
            deps: browserDeps(settings),
            settings,
            onAction: (action) => {
                if (action.type === "start") {
                    setLines([]);
                    setEvaluation(null);
                }
                dispatch(action);
            },
            onTranscript: (piece) => setLines((current) => applyTranscriptPiece(current, piece)),
            onEvaluation: setEvaluation,
        }),
    );

    useEffect(() => {
        const onPageHide = () => session.dispose();
        window.addEventListener("pagehide", onPageHide);
        return () => {
            window.removeEventListener("pagehide", onPageHide);
            session.dispose();
        };
    }, [session]);

    return {
        state,
        lines,
        evaluation,
        start: session.start,
        finishWithFeedback: session.finishWithFeedback,
        end: session.end,
        setMuted: session.setMuted,
        enableAudio: session.enableAudio,
    };
}
