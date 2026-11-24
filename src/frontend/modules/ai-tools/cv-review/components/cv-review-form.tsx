"use client";

import { useId } from "react";
import { ScanSearch } from "lucide-react";

import { Button, Field, Input } from "@/frontend/shared/ui";
import { CV_REVIEW_LIMITS as L } from "@/shared/contracts/cv-review";

import type { useCvReview } from "../hooks/use-cv-review";
import { CvInput } from "../../shared/components/cv-input";
import { ToolInput } from "../../shared/components/tool-parts";

/** The input column: the CV (a saved one, a file read in the browser, or pasted text) and the role it's aimed at. */
export function CvReviewForm({ tool }: { tool: ReturnType<typeof useCvReview> }) {
    const id = useId();

    return (
        <ToolInput>
            <div>
                <h2 className="text-[15px] font-semibold text-fg-primary">Your CV</h2>
                <p className="mt-0.5 text-[13px] text-fg-tertiary">Scored the way recruiters and ATS software read it.</p>
            </div>

            <CvInput input={tool.cv} action="review it" />

            <Field label="Target role" hint="From your preferences. Leave it empty to judge the CV on its own direction." htmlFor={`${id}-role`}>
                <Input
                    id={`${id}-role`}
                    value={tool.targetRole}
                    onChange={(event) => tool.setTargetRole(event.target.value)}
                    maxLength={L.targetRole}
                    placeholder="Frontend Engineer"
                />
            </Field>

            <div>
                <Button variant="primary" className="w-full" onClick={tool.openPicker} disabled={!tool.canReview}>
                    <ScanSearch /> Review my CV
                </Button>
                <p aria-live="polite" className="mt-2 min-h-5 text-[13px]">
                    {tool.error ? (
                        <span role="alert" className="text-status-rose">
                            {tool.error}
                        </span>
                    ) : tool.cv.reading ? null : tool.cv.tooShort ? (
                        <span className="text-fg-tertiary">
                            {tool.cv.mode === "file" ? "Choose your CV file to review it." : "Paste your CV to review it."}
                        </span>
                    ) : null}
                </p>
            </div>
        </ToolInput>
    );
}
