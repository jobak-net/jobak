import { AGENT_STATES, type AgentState, type CallAction } from "./call-state";
import { EVALUATION_TOOL, parseEvaluation, WRAP_UP_MESSAGE, type InterviewEvaluation } from "./evaluation";
import { buildAgentMetadata, type InterviewDetails } from "./interview-metadata";
import { toSetupError, type LiveKitSettings } from "./livekit-settings";
import type { Speaker, TranscriptPiece } from "./transcript";

/** How long the interviewer has to join after the call connects. */
export const AGENT_JOIN_TIMEOUT_MS = 30_000;
/** After "Finish and get feedback": how long the interviewer has to send its evaluation. */
export const EVALUATION_TIMEOUT_MS = 45_000;
/** Between the evaluation arriving and hanging up, so the tool's reply reaches the agent first. */
const HANG_UP_DELAY_MS = 1_200;

/** The topic LiveKit agents read typed user input from. */
const CHAT_TOPIC = "lk.chat";

/** The parts of livekit-client's `Room` a session uses; the real `Room` fits, and tests pass a fake. */
export interface RoomLike {
    on(event: string, listener: (...args: never[]) => void): unknown;
    connect(serverUrl: string, token: string): Promise<void>;
    disconnect(): Promise<void>;
    registerTextStreamHandler(topic: string, handler: (reader: never, participantInfo: { identity: string }) => void): void;
    registerRpcMethod(method: string, handler: (data: { payload: string }) => Promise<string>): void;
    startAudio(): Promise<void>;
    localParticipant: {
        trackPublications: Map<string, unknown>;
        setMicrophoneEnabled(on: boolean): Promise<unknown>;
        sendText(text: string, options?: { topic?: string }): Promise<unknown>;
    };
    remoteParticipants: Map<string, unknown>;
}

interface ParticipantLike {
    isAgent?: boolean;
    attributes?: Record<string, string>;
}
interface TrackLike {
    sid?: string;
    kind?: string;
}
interface StreamReaderLike {
    info: { id: string; attributes?: Record<string, string> };
    [Symbol.asyncIterator](): AsyncIterator<string>;
}

/** What a session needs from the browser and LiveKit; the hook passes the real ones. */
export interface SessionDeps {
    /** Asks for the microphone; throws when it's refused or missing. */
    requestMic(): Promise<void>;
    fetchToken(options: {
        roomName: string;
        participantIdentity: string;
        participantName: string;
        agentName: string;
        agentMetadata: string;
    }): Promise<{ serverUrl: string; participantToken: string }>;
    createRoom(): RoomLike;
    setTimer(fn: () => void, ms: number): unknown;
    clearTimer(handle: unknown): void;
    now(): number;
    /** Plays a remote audio track; returns how to stop it. */
    attachAudio(track: unknown): () => void;
    /** Whether a `Disconnected` reason is a normal ending (the room closed after the interview), not a dropped call. */
    isNormalDisconnect(reason: unknown): boolean;
}

const TRANSCRIPTION_TOPIC = "lk.transcription";

function agentStateOf(participant: ParticipantLike): AgentState | null {
    const value = participant.attributes?.["lk.agent.state"];
    return AGENT_STATES.includes(value as AgentState) ? (value as AgentState) : null;
}

const isAgent = (participant: ParticipantLike) => participant.isAgent === true || agentStateOf(participant) !== null;

/**
 * One practice call at a time, on the user's LiveKit project:
 * mic permission, a token from their token server (with the interviewer agent
 * and this interview's details), the room, the interviewer's audio, its
 * state, the live transcript, and its evaluation at the end: the agent calls
 * the `submit_evaluation` client tool, which arrives here as an RPC call.
 * "Finish and get feedback" types a wrap-up message to the agent, waits for
 * that evaluation (or gives up after `EVALUATION_TIMEOUT_MS`), then hangs up.
 *
 * Every start is an "attempt". Ending, disposing or starting again makes the
 * running attempt stale: whatever it was still awaiting is dropped, a room it
 * created is disconnected, and its events stop reaching the page. So the mic
 * is never left on and the agent never keeps running after the user moved on.
 */
export function createInterviewSession({
    deps,
    settings,
    onAction,
    onTranscript,
    onEvaluation,
}: {
    deps: SessionDeps;
    settings: LiveKitSettings;
    onAction: (action: CallAction) => void;
    onTranscript: (piece: TranscriptPiece) => void;
    onEvaluation: (evaluation: InterviewEvaluation) => void;
}) {
    let attempt = 0;
    let room: RoomLike | null = null;
    let joinTimer: unknown = null;
    /** Set while waiting for the evaluation after "Finish and get feedback". */
    let feedbackTimer: unknown = null;
    const playing = new Map<string, () => void>();

    function hangUp() {
        if (joinTimer !== null) deps.clearTimer(joinTimer);
        joinTimer = null;
        if (feedbackTimer !== null) deps.clearTimer(feedbackTimer);
        feedbackTimer = null;
        for (const stop of playing.values()) stop();
        playing.clear();
        const current = room;
        room = null;
        void current?.disconnect();
    }

    /** Ends the running attempt from inside (timeout, interviewer left, room closed): stale from now on. */
    function finish(action: CallAction) {
        onAction(action);
        attempt++;
        hangUp();
    }

    async function start(details: InterviewDetails, candidateName: string | null): Promise<void> {
        const id = ++attempt;
        hangUp();
        const current = () => id === attempt;
        onAction({ type: "start" });

        // The mic first: no permission, no call, so no agent is started on the user's account.
        try {
            await deps.requestMic();
        } catch {
            if (current()) onAction({ type: "mic-denied" });
            return;
        }
        if (!current()) return;
        onAction({ type: "mic-ok" });

        const identity = `candidate-${crypto.randomUUID()}`;
        let connection: { serverUrl: string; participantToken: string };
        try {
            connection = await deps.fetchToken({
                roomName: `interview-${crypto.randomUUID()}`,
                participantIdentity: identity,
                participantName: candidateName?.trim() || "Candidate",
                agentName: settings.agentName,
                agentMetadata: buildAgentMetadata(details, candidateName),
            });
        } catch (error) {
            if (current()) onAction({ type: "ended", reason: toSetupError(error).kind === "rejected" ? "token-rejected" : "network" });
            return;
        }
        if (!current()) return;

        const next = deps.createRoom();
        room = next;
        const mine = () => current() && room === next;

        const watchAgent = (participant: ParticipantLike) => {
            if (!mine() || !isAgent(participant)) return;
            if (joinTimer !== null) deps.clearTimer(joinTimer);
            joinTimer = null;
            onAction({ type: "agent-joined" });
            const agentState = agentStateOf(participant);
            if (agentState) onAction({ type: "agent-state", state: agentState });
        };

        next.on("participantConnected", (participant: ParticipantLike) => watchAgent(participant));
        next.on("participantAttributesChanged", (_changed: unknown, participant: ParticipantLike) => watchAgent(participant));
        next.on("participantDisconnected", (participant: ParticipantLike) => {
            if (mine() && isAgent(participant)) finish({ type: "ended", reason: "finished" });
        });
        next.on("trackSubscribed", (track: TrackLike) => {
            if (!mine() || track.kind !== "audio" || !track.sid) return;
            playing.get(track.sid)?.();
            playing.set(track.sid, deps.attachAudio(track));
        });
        next.on("trackUnsubscribed", (track: TrackLike) => {
            if (!track.sid) return;
            playing.get(track.sid)?.();
            playing.delete(track.sid);
        });
        next.on("audioPlaybackChanged", (isPlaying: boolean) => {
            if (mine()) onAction({ type: "audio-blocked", on: !isPlaying });
        });
        next.on("disconnected", (reason: unknown) => {
            if (!mine()) return;
            finish({ type: "ended", reason: deps.isNormalDisconnect(reason) ? "finished" : "dropped" });
        });

        next.registerRpcMethod(EVALUATION_TOOL.name, async ({ payload }) => {
            if (!mine()) return "The interview has already ended.";
            const evaluation = parseEvaluation(payload);
            // Thrown, not returned: a Silent tool ignores the reply, but an error still reaches the agent, so it can call again.
            if (!evaluation) throw new Error("That evaluation couldn't be read. Call submit_evaluation again, with mistakes as a JSON array.");
            onEvaluation(evaluation);
            if (feedbackTimer !== null) {
                deps.clearTimer(feedbackTimer);
                feedbackTimer = null;
                deps.setTimer(() => {
                    if (mine()) finish({ type: "ended", reason: "evaluated" });
                }, HANG_UP_DELAY_MS);
            }
            return "Evaluation received. The candidate can see it now.";
        });

        next.registerTextStreamHandler(TRANSCRIPTION_TOPIC, (async (reader: StreamReaderLike, participantInfo: { identity: string }) => {
            if (!mine()) return;
            const header = reader.info.attributes ?? {};
            const segmentId = header["lk.segment_id"] ?? reader.info.id;
            const ownTracks = [...next.localParticipant.trackPublications.keys()];
            const speaker: Speaker =
                participantInfo.identity === identity || ownTracks.includes(header["lk.transcribed_track_id"] ?? "") ? "you" : "interviewer";
            let text = "";
            try {
                for await (const chunk of reader) {
                    text += chunk;
                    if (mine()) onTranscript({ segmentId, speaker, text, final: false });
                }
            } catch {
                /* the stream broke off: keep what arrived */
            }
            // The final flag comes in the stream's trailer, which replaces `info.attributes`: read it again now.
            const final = String(reader.info.attributes?.["lk.transcription_final"]) === "true";
            if (mine() && text) onTranscript({ segmentId, speaker, text, final });
        }) as never);

        try {
            await next.connect(connection.serverUrl, connection.participantToken);
        } catch {
            if (mine()) finish({ type: "ended", reason: "network" });
            else void next.disconnect();
            return;
        }
        if (!mine()) {
            // Ended or replaced while connecting: this room must not stay open.
            void next.disconnect();
            return;
        }
        onAction({ type: "connected", at: deps.now() });
        joinTimer = deps.setTimer(() => {
            if (mine()) finish({ type: "timeout" });
        }, AGENT_JOIN_TIMEOUT_MS);
        next.remoteParticipants.forEach((participant) => watchAgent(participant as ParticipantLike));

        await next.localParticipant.setMicrophoneEnabled(true).catch(() => undefined);
        if (!mine()) void next.disconnect();
    }

    return {
        start,
        /**
         * The user wants feedback: the interviewer is asked (in writing) to wrap
         * up and send its evaluation; the mic goes off so nothing interrupts it.
         */
        finishWithFeedback() {
            const current = room;
            if (!current || feedbackTimer !== null) return;
            const id = attempt;
            const mine = () => id === attempt && room === current;
            onAction({ type: "finishing" });
            void current.localParticipant.setMicrophoneEnabled(false).catch(() => undefined);
            feedbackTimer = deps.setTimer(() => {
                if (mine()) finish({ type: "ended", reason: "no-evaluation" });
            }, EVALUATION_TIMEOUT_MS);
            current.localParticipant.sendText(WRAP_UP_MESSAGE, { topic: CHAT_TOPIC }).catch(() => {
                if (mine()) finish({ type: "ended", reason: "no-evaluation" });
            });
        },
        /** The user ends the call. */
        end() {
            onAction({ type: "ended", reason: "user" });
            attempt++;
            hangUp();
        },
        setMuted(on: boolean) {
            onAction({ type: "mute", on });
            void room?.localParticipant.setMicrophoneEnabled(!on);
        },
        /** After the browser blocked playback: called from a click, so the browser allows it. */
        async enableAudio() {
            await room?.startAudio();
            onAction({ type: "audio-blocked", on: false });
        },
        /** The page is going away: hang up whatever is running or starting, silently. */
        dispose() {
            attempt++;
            hangUp();
        },
    };
}

export type InterviewSession = ReturnType<typeof createInterviewSession>;
