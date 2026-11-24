"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

import type { useInterviewCall } from "../hooks/use-interview-call";
import { downloadFeedbackPdf } from "../lib/evaluation-pdf";
import type { InterviewDetails } from "../lib/interview-metadata";
import { CallPanel } from "./call-panel";
import { EvaluationView } from "./evaluation-view";
import { TranscriptView } from "./transcript-view";

type Call = ReturnType<typeof useInterviewCall>;

/** A call is running or starting: closing the modal would end it. */
export const isCallActive = (call: Call) => !["idle", "ended"].includes(call.state.phase);

/**
 * The practice call in a modal, so nothing needs scrolling: the status bar on
 * top, the live transcript filling the rest. After the call, the
 * interviewer's evaluation (with "Download PDF") above the transcript.
 * Full screen on phones. Closing during a call asks first, since it hangs up.
 */
export function CallModal({
    open,
    onClose,
    call,
    details,
    candidateName,
}: {
    open: boolean;
    onClose: () => void;
    call: Call;
    details: InterviewDetails;
    candidateName: string | null;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const id = useId();
    const ended = call.state.phase === "ended";

    useEffect(() => {
        const element = dialog.current;
        if (!element) return;
        if (open && !element.open) element.showModal();
        if (!open && element.open) element.close();
    }, [open]);

    function requestClose() {
        if (isCallActive(call)) {
            if (!window.confirm("End the interview? You won't get feedback for it.")) return;
            call.end();
        }
        onClose();
    }

    return (
        <dialog
            ref={dialog}
            aria-labelledby={`${id}-title`}
            onCancel={(event) => {
                event.preventDefault();
                requestClose();
            }}
            className="m-auto h-[min(860px,calc(100dvh-2rem))] max-h-none w-[min(960px,calc(100vw-2rem))] max-w-none flex-col overflow-hidden rounded-hero border border-border-standard bg-bg-panel p-0 text-fg-primary shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] backdrop:bg-black/70 open:flex max-sm:h-dvh max-sm:w-screen max-sm:rounded-none max-sm:border-0"
        >
            <header className="flex items-start gap-4 border-b border-border-subtle px-6 py-4 max-sm:px-4">
                <div className="min-w-0 flex-1">
                    <h2 id={`${id}-title`} className="truncate text-[17px] font-semibold tracking-[-0.02em]">
                        {details.role} at {details.company}
                    </h2>
                    <p className="text-[13px] text-fg-tertiary">Practice interview</p>
                </div>
                <button
                    type="button"
                    onClick={requestClose}
                    aria-label={isCallActive(call) ? "End the interview and close" : "Close"}
                    className="rounded-control p-1.5 text-fg-tertiary outline-none hover:bg-white/5 hover:text-fg-primary focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                    <X className="size-5" />
                </button>
            </header>

            <div className="border-b border-border-subtle px-6 py-4 max-sm:px-4">
                <CallPanel
                    state={call.state}
                    onFinish={call.finishWithFeedback}
                    onEnd={call.end}
                    onMute={call.setMuted}
                    onEnableAudio={() => void call.enableAudio()}
                />
            </div>

            {ended ? (
                <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6 max-sm:px-4">
                    {call.evaluation && (
                        <EvaluationView
                            evaluation={call.evaluation}
                            onDownload={() =>
                                downloadFeedbackPdf({ details, evaluation: call.evaluation!, lines: call.lines, candidateName, date: new Date() })
                            }
                        />
                    )}
                    <TranscriptView lines={call.lines} ended />
                </div>
            ) : (
                <div className="flex min-h-0 flex-1 flex-col px-6 py-5 max-sm:px-4">
                    {call.lines.length > 0 ? (
                        <TranscriptView lines={call.lines} ended={false} fill />
                    ) : (
                        <p className="m-auto max-w-sm text-center text-sm leading-relaxed text-fg-tertiary">
                            The transcript appears here as you talk. When you&apos;re done, press Finish and get feedback.
                        </p>
                    )}
                </div>
            )}
        </dialog>
    );
}
