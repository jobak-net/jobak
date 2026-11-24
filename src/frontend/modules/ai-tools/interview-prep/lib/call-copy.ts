import type { CallState } from "./call-state";

/** The status line for a call, in the page's words (the spec's error table for endings). */
export function callStatusText(state: CallState): string {
    switch (state.phase) {
        case "idle":
            return "";
        case "mic":
            return "Asking for your microphone…";
        case "connecting":
            return "Connecting…";
        case "waiting-agent":
            return "Interviewer is joining…";
        case "live":
            switch (state.agent) {
                case "speaking":
                    return "Interviewer is speaking";
                case "listening":
                    return "Listening to you";
                case "thinking":
                    return "Interviewer is thinking…";
                case "initializing":
                    return "Interviewer is getting ready…";
                default:
                    return "Interviewer is here";
            }
        case "finishing":
            return "Writing your feedback…";
        case "ended":
            switch (state.end) {
                case "user":
                    return "Interview ended.";
                case "evaluated":
                    return "Interview finished. Your feedback is ready.";
                case "no-evaluation":
                    return "The interviewer didn't send feedback. Check that the agent has the submit_evaluation tool (Agent Builder › Actions) and is deployed.";
                case "finished":
                    return "The interviewer ended the interview.";
                case "dropped":
                    return "The call dropped.";
                case "agent-missing":
                    return "The interviewer didn't join. Check the agent name in Settings matches the one in LiveKit, and that the agent is deployed.";
                case "mic-denied":
                    return "Allow the microphone to practise. Your browser asks once.";
                case "token-rejected":
                    return "LiveKit didn't accept this token server ID. Check it in LiveKit › Settings.";
                default:
                    return "LiveKit couldn't be reached. Check your connection.";
            }
    }
}

/** "4:07" from milliseconds. */
export function elapsedText(ms: number): string {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
