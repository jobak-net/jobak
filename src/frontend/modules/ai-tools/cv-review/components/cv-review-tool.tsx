"use client";

import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";
import type { SavedCv } from "@/shared/contracts/applicant";

import { useCvReview } from "../hooks/use-cv-review";
import { ProviderPickerDialog } from "../../shared/components/provider-picker-dialog";
import { ResultArea, ResultSheet } from "../../shared/components/tool-parts";
import { CvReviewForm } from "./cv-review-form";
import { ImprovedCv } from "./improved-cv";
import { ReviewAts } from "./review-ats";
import { ReviewFindings } from "./review-findings";
import { ReviewOverview } from "./review-overview";

/**
 * The CV review tool: the CV on the left, the review on the right, the
 * provider popup between pressing Review and the review arriving, and the
 * improved CV at the bottom of the review, when asked for.
 */
export function CvReviewTool({
    defaults,
    ai,
    savedCvs,
}: {
    defaults: { targetRole: string; name: string };
    /** The user's AI settings, for the popup. Null when they couldn't be read. */
    ai: AiSettingsResponse | null;
    /** Their saved CVs, most recently used first. */
    savedCvs: SavedCv[];
}) {
    const tool = useCvReview(defaults, savedCvs);
    const status = tool.reviewing ? "running" : tool.review ? "done" : "idle";

    return (
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <CvReviewForm tool={tool} />

            <ResultArea
                status={status}
                emptyTitle="No review yet"
                emptyHint="Add your CV and press Review to see your score, what an ATS makes of it, and what to fix."
            >
                {tool.review && (
                    <ResultSheet>
                        <ReviewOverview review={tool.review} />
                        <ReviewFindings review={tool.review} cvText={tool.reviewedText} />
                        <ReviewAts review={tool.review} cvText={tool.reviewedText} />
                        <ImprovedCv
                            review={tool.review}
                            original={tool.reviewedText}
                            improved={tool.improved}
                            text={tool.improvedText}
                            onTextChange={tool.setImprovedText}
                            improving={tool.improving}
                            error={tool.improveError}
                            onImprove={tool.improve}
                            name={defaults.name}
                        />
                    </ResultSheet>
                )}
            </ResultArea>

            {ai && (
                <ProviderPickerDialog
                    open={tool.pickerOpen}
                    ai={ai}
                    actionLabel="Review with"
                    pending={tool.reviewing}
                    onConfirm={tool.reviewWith}
                    onClose={tool.closePicker}
                />
            )}
        </div>
    );
}
