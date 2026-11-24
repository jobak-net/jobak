/**
 * Checks the LiveKit setup used by interview practice, without starting a
 * call: asking the token server for a token starts no agent and costs
 * nothing. Reads LIVEKIT_TOKEN_SERVER_ID and LIVEKIT_AGENT_NAME from .env and
 * never prints them.
 *
 *   pnpm check:livekit
 */

import { TokenSource } from "livekit-client";

import { checkTokenServer, LiveKitSetupError, projectHost } from "../src/frontend/modules/ai-tools/interview-prep/lib/livekit-settings";

async function main() {
    const tokenServerId = process.env.LIVEKIT_TOKEN_SERVER_ID;
    const agentName = process.env.LIVEKIT_AGENT_NAME;
    if (!tokenServerId || !agentName) throw new Error("LIVEKIT_TOKEN_SERVER_ID and LIVEKIT_AGENT_NAME must be set (run with --env-file=.env)");

    const projectUrl = await checkTokenServer(tokenServerId);
    console.log(`token server: accepted, project ${projectHost(projectUrl) ?? "(no URL returned)"}`);

    const { serverUrl, participantToken } = await TokenSource.developmentTokenServer(tokenServerId).fetch({
        roomName: `jobak-check-${crypto.randomUUID()}`,
        participantName: "check",
        agentName,
        agentMetadata: JSON.stringify({ role: "check", company: "check", job_description: "check", candidate_name: "check" }),
    });
    console.log(`with agent: server ${new URL(serverUrl).host}, token length ${participantToken.length}`);

    try {
        await checkTokenServer("not-a-real-token-server");
        console.log("bogus id: ACCEPTED (unexpected)");
    } catch (error) {
        console.log(`bogus id: ${error instanceof LiveKitSetupError ? error.kind : String(error)}`);
    }

    try {
        await checkTokenServer("https://cloud-api.livekit.io/api/v2/sandbox/connection-details");
        console.log("pasted URL: ACCEPTED (unexpected)");
    } catch (error) {
        console.log(`pasted URL: ${error instanceof LiveKitSetupError ? error.kind : String(error)}`);
    }
}

main().catch((error) => {
    console.error("failed:", error instanceof LiveKitSetupError ? `${error.kind}` : (error as Error).message);
    process.exit(1);
});
