"use client";

import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";

import { useCoverLetter } from "../hooks/use-cover-letter";
import { ProviderPickerDialog } from "../../shared/components/provider-picker-dialog";
import { ResultArea } from "../../shared/components/tool-parts";
import { CoverLetterForm } from "./cover-letter-form";
import { CoverLetterResult } from "./cover-letter-result";

/**
 * The cover letter tool: the form on the left, the draft on the right, and
 * the provider popup between pressing Write and the letter being written.
 */
export function CoverLetterTool({
    defaults,
    ai,
}: {
    defaults: { name: string };
    /** The user's AI settings, for the popup. Null when they couldn't be read. */
    ai: AiSettingsResponse | null;
}) {
    const tool = useCoverLetter(defaults);
    const status = tool.writing ? "running" : tool.result ? "done" : "idle";

    return (
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <CoverLetterForm tool={tool} />

            <ResultArea
                status={status}
                emptyTitle="No draft yet"
                emptyHint="Fill in the job and press Write. Your AI writes it from your profile, for this posting."
            >
                {tool.result && (
                    <CoverLetterResult
                        result={tool.result}
                        letter={tool.letter}
                        onLetterChange={tool.setLetter}
                        meta={{ name: tool.fields.name, company: tool.fields.company }}
                        facts={tool.fields.experience}
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
