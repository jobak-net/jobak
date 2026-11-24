"use client";

import { useState } from "react";

import { ClipboardCheck } from "lucide-react";

import { Button, PageHeader } from "@/frontend/shared/ui";

import { CallModal, isCallActive } from "../components/call-modal";
import { InterviewForm } from "../components/interview-form";
import { LiveKitGate } from "../components/livekit-gate";
import { TranscriptView } from "../components/transcript-view";
import { useInterviewCall } from "../hooks/use-interview-call";
import type { InterviewDetails } from "../lib/interview-metadata";
import type { LiveKitSettings } from "../lib/livekit-settings";

const EMPTY: InterviewDetails = { role: "", company: "", jobDescription: "" };

function Practice({ settings, candidateName }: { settings: LiveKitSettings; candidateName: string | null }) {
    const [details, setDetails] = useState<InterviewDetails>(EMPTY);
    // The details the running (or last) call was started with: the form can change meanwhile.
    const [callDetails, setCallDetails] = useState<InterviewDetails>(EMPTY);
    const [open, setOpen] = useState(false);
    const call = useInterviewCall(settings);

    function start() {
        setCallDetails(details);
        setOpen(true);
        void call.start(details, candidateName);
    }

    return (
        <div className="space-y-6">
            <InterviewForm details={details} onChange={setDetails} onStart={start} busy={isCallActive(call)} />
            {call.state.phase === "ended" && !open && (
                <div className="flex flex-wrap items-center gap-3 rounded-card border border-border-subtle bg-white/2 px-4 py-3">
                    <p className="min-w-0 flex-1 text-sm text-fg-secondary">
                        Last interview: {callDetails.role} at {callDetails.company}
                        {call.evaluation?.score != null && <span className="text-fg-tertiary">, scored {call.evaluation.score}/10</span>}
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
                        <ClipboardCheck /> {call.evaluation ? "View feedback" : "View transcript"}
                    </Button>
                </div>
            )}
            <CallModal open={open} onClose={() => setOpen(false)} call={call} details={callDetails} candidateName={candidateName} />
        </div>
    );
}

/** What the locked page shows, blurred, behind the setup card. */
function Preview() {
    return (
        <div className="space-y-6">
            <InterviewForm details={{ role: "Back End Developer", company: "Khazna", jobDescription: "Build payments APIs…" }} onChange={() => {}} onStart={() => {}} busy />
            <TranscriptView
                ended={false}
                lines={[
                    { id: "1", speaker: "interviewer", text: "Thanks for joining. Tell me about a system you designed recently.", final: true },
                    { id: "2", speaker: "you", text: "At my last job I built the payouts service…", final: true },
                ]}
            />
        </div>
    );
}

/**
 * /dashboard/interview-prep: a practice interview by voice with an AI HR
 * interviewer, on the user's own LiveKit account, from this browser.
 */
export function InterviewPrepView({ accountId, candidateName }: { accountId: string; candidateName: string | null }) {
    return (
        <>
            <PageHeader
                title="Interview practice"
                description="Practise out loud with an AI interviewer that runs on your own LiveKit account."
            />
            <LiveKitGate accountId={accountId} preview={<Preview />}>
                {/* Keyed by the setup: changing it in another tab starts a fresh call session. */}
                {(settings) => <Practice key={`${settings.tokenServerId}|${settings.agentName}`} settings={settings} candidateName={candidateName} />}
            </LiveKitGate>
        </>
    );
}
