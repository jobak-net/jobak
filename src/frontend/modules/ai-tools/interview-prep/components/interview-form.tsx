"use client";

import { useId } from "react";
import { Loader2, Mic } from "lucide-react";

import { Button, Field, Input, Textarea } from "@/frontend/shared/ui";

import { canStart, INTERVIEW_LIMITS, type InterviewDetails } from "../lib/interview-metadata";

/** Role, company and job description: what the interviewer is told about this interview. */
export function InterviewForm({
    details,
    onChange,
    onStart,
    busy,
}: {
    details: InterviewDetails;
    onChange: (details: InterviewDetails) => void;
    onStart: () => void;
    /** A call is starting or going: the form is locked. */
    busy: boolean;
}) {
    const id = useId();
    const set = (key: keyof InterviewDetails) => (value: string) => onChange({ ...details, [key]: value });

    return (
        <div className="space-y-4 rounded-3xl border border-border-subtle p-5 sm:p-7">
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Role" htmlFor={`${id}-role`}>
                    <Input
                        id={`${id}-role`}
                        value={details.role}
                        onChange={(event) => set("role")(event.target.value)}
                        maxLength={INTERVIEW_LIMITS.role}
                        placeholder="Back End Developer"
                        disabled={busy}
                    />
                </Field>
                <Field label="Company" htmlFor={`${id}-company`}>
                    <Input
                        id={`${id}-company`}
                        value={details.company}
                        onChange={(event) => set("company")(event.target.value)}
                        maxLength={INTERVIEW_LIMITS.company}
                        placeholder="Khazna"
                        disabled={busy}
                    />
                </Field>
            </div>
            <Field label="Job description" hint="The interviewer draws its questions from this." htmlFor={`${id}-jd`}>
                <Textarea
                    id={`${id}-jd`}
                    rows={7}
                    value={details.jobDescription}
                    onChange={(event) => set("jobDescription")(event.target.value)}
                    maxLength={INTERVIEW_LIMITS.jobDescription}
                    placeholder="Paste the job posting"
                    disabled={busy}
                />
            </Field>
            <div className="flex flex-wrap items-center justify-end gap-3">
                <p className="min-w-0 flex-1 text-[13px] text-fg-tertiary">
                    A voice call in this browser, about 15 minutes. You&apos;ll need your microphone.
                </p>
                <Button variant="primary" onClick={onStart} disabled={busy || !canStart(details)}>
                    {busy ? <Loader2 className="animate-spin" /> : <Mic />}
                    Start interview
                </Button>
            </div>
        </div>
    );
}
