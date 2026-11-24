"use client";

import { useMemo } from "react";

import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";
import type { SavedCv } from "@/shared/contracts/applicant";
import { scanJobPosting } from "@/shared/ai-tools";

import { useHrEmail } from "../hooks/use-hr-email";
import { ProviderPickerDialog } from "../../shared/components/provider-picker-dialog";
import { ResultArea } from "../../shared/components/tool-parts";
import { HrEmailForm } from "./hr-email-form";
import { HrEmailResult } from "./hr-email-result";

/**
 * The HR email tool: what the email is for and its details on the left, the
 * email on the right, and the provider popup between pressing Write and the
 * email arriving.
 */
export function HrEmailTool({
    name,
    ai,
    savedCvs,
}: {
    /** What the name field starts with. */
    name: string;
    /** The user's AI settings, for the popup. Null when they couldn't be read. */
    ai: AiSettingsResponse | null;
    /** Their saved CVs, most recently used first. */
    savedCvs: SavedCv[];
}) {
    const tool = useHrEmail({ name }, savedCvs);
    const status = tool.writing ? "running" : tool.result ? "done" : "idle";
    // What was pasted planted for AI tools: flagged if it reaches the edited email.
    const plantedWords = useMemo(
        () => [...new Set([...scanJobPosting(tool.fields.posting).plantedWords, ...scanJobPosting(tool.fields.theirMessage).plantedWords])],
        [tool.fields.posting, tool.fields.theirMessage],
    );

    return (
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <HrEmailForm tool={tool} />

            <ResultArea
                status={status}
                emptyTitle="No email yet"
                emptyHint="Pick what the email is for, add what it should say, and press Write. Short, natural, and only your facts."
            >
                {tool.result && (
                    <HrEmailResult
                        result={tool.result}
                        subject={tool.subject}
                        onSubjectChange={tool.setSubject}
                        body={tool.body}
                        onBodyChange={tool.setBody}
                        styleFlags={tool.styleFlags}
                        recipientEmail={tool.recipientEmail}
                        plantedWords={plantedWords}
                    />
                )}
            </ResultArea>

            {ai && (
                <ProviderPickerDialog
                    open={tool.pickerOpen}
                    ai={ai}
                    actionLabel="Write with"
                    pending={tool.writing}
                    onConfirm={tool.writeWith}
                    onClose={tool.closePicker}
                />
            )}
        </div>
    );
}
