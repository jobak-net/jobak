/**
 * One practice call, as the page shows it: asking for the mic, connecting,
 * waiting for the interviewer, live, ended (and why). A plain reducer:
 * `useInterviewCall` reports what LiveKit does, this decides what's shown.
 */

export type CallPhase = "idle" | "mic" | "connecting" | "waiting-agent" | "live" | "finishing" | "ended";
export type AgentState = "initializing" | "listening" | "thinking" | "speaking" | "idle";
export type CallEnd =
    | "user"
    | "finished"
    | "evaluated"
    | "no-evaluation"
    | "dropped"
    | "agent-missing"
    | "mic-denied"
    | "token-rejected"
    | "network";

export interface CallState {
    phase: CallPhase;
    /** What the interviewer is doing, from its `lk.agent.state` attribute. */
    agent: AgentState | null;
    end: CallEnd | null;
    /** When the call connected (ms), for the timer. */
    startedAt: number | null;
    muted: boolean;
    /** The browser blocked the interviewer's audio until the user clicks something. */
    audioBlocked: boolean;
}

export type CallAction =
    | { type: "start" }
    | { type: "mic-ok" }
    | { type: "mic-denied" }
    | { type: "connected"; at: number }
    | { type: "agent-joined" }
    | { type: "agent-state"; state: AgentState }
    | { type: "timeout" }
    /** The user asked for feedback: the interviewer wraps up and sends its evaluation. */
    | { type: "finishing" }
    | { type: "mute"; on: boolean }
    | { type: "audio-blocked"; on: boolean }
    | { type: "ended"; reason: CallEnd };

export const initialCall: CallState = { phase: "idle", agent: null, end: null, startedAt: null, muted: false, audioBlocked: false };

export const AGENT_STATES: readonly AgentState[] = ["initializing", "listening", "thinking", "speaking", "idle"];

export function callReducer(state: CallState, action: CallAction): CallState {
    switch (action.type) {
        case "start":
            return state.phase === "idle" || state.phase === "ended" ? { ...initialCall, phase: "mic" } : state;
        case "mic-ok":
            return state.phase === "mic" ? { ...state, phase: "connecting" } : state;
        case "mic-denied":
            return state.phase === "mic" ? { ...state, phase: "ended", end: "mic-denied" } : state;
        case "connected":
            return state.phase === "connecting" ? { ...state, phase: "waiting-agent", startedAt: action.at } : state;
        case "agent-joined":
            return state.phase === "waiting-agent" ? { ...state, phase: "live" } : state;
        case "agent-state":
            return state.phase === "live" || state.phase === "finishing" ? { ...state, agent: action.state } : state;
        case "finishing":
            return state.phase === "live" ? { ...state, phase: "finishing" } : state;
        case "timeout":
            return state.phase === "waiting-agent" ? { ...state, phase: "ended", end: "agent-missing" } : state;
        case "mute":
            return state.phase === "live" || state.phase === "waiting-agent" ? { ...state, muted: action.on } : state;
        case "audio-blocked":
            return state.phase === "live" || state.phase === "waiting-agent" || state.phase === "finishing" ? { ...state, audioBlocked: action.on } : state;
        case "ended":
            // The first reason sticks: ending the call yourself, then the disconnect it causes, stays "user".
            if (state.phase === "ended" || state.phase === "idle") return state;
            return { ...state, phase: "ended", end: action.reason };
    }
}
