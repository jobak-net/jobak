"use client";

import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";
import type { SavedCv } from "@/shared/contracts/applicant";

import { useCvTailor } from "../hooks/use-cv-tailor";
import { PostingCheck } from "../../shared/components/posting-check";
import { ProviderPickerDialog } from "../../shared/components/provider-picker-dialog";
import { ResultArea, ResultSection, ResultSheet } from "../../shared/components/tool-parts";
import { CvTailorForm } from "./cv-tailor-form";
import { FitOverview } from "./fit-overview";
import { RequirementsList } from "./requirements-list";
import { TailoredCv } from "./tailored-cv";

/**
 * The CV tailoring tool: the job and the CV on the left, the analysis on the
 * right, the provider popup between pressing Analyse and the analysis
 * arriving, and the tailored CV at the bottom of the analysis, when asked for.
 */
export function CvTailorTool({
    name,
    ai,
    savedCvs,
}: {
    /** The name on applications, for the tailored CV's file name. */
    name: string;
    /** The user's AI settings, for the popup. Null when they couldn't be read. */
    ai: AiSettingsResponse | null;
    /** Their saved CVs, most recently used first. */
    savedCvs: SavedCv[];
}) {
    const tool = useCvTailor(savedCvs);
    const status = tool.analyzing ? "running" : tool.fit ? "done" : "idle";

    return (
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <CvTailorForm tool={tool} />

            <ResultArea
                status={status}
                emptyTitle="Nothing tailored yet"
                emptyHint="Paste the job posting, add your CV, and press Analyse to see how you fit, then get your CV written for that role."
            >
                {tool.fit && tool.analysed && (
                    <ResultSheet>
                        <FitOverview fit={tool.fit} job={tool.analysed.job} />
                        {tool.fit.requirements.length > 0 && (
                            <ResultSection title="What the job asks for">
                                <RequirementsList requirements={tool.fit.requirements} />
                            </ResultSection>
                        )}
                        {tool.fit.postingFindings.length > 0 && (
                            <ResultSection>
                                <PostingCheck findings={tool.fit.postingFindings} />
                            </ResultSection>
                        )}
                        <TailoredCv
                            fit={tool.fit}
                            original={tool.analysed.cv.text}
                            job={tool.analysed.job}
                            plantedWords={tool.scan.plantedWords}
                            tailored={tool.tailored}
                            text={tool.tailoredText}
                            onTextChange={tool.setTailoredText}
                            tailoring={tool.tailoring}
                            error={tool.tailorError}
                            onTailor={tool.tailor}
                            name={name}
                        />
                    </ResultSheet>
                )}
            </ResultArea>

            {ai && (
                <ProviderPickerDialog
                    open={tool.pickerOpen}
                    ai={ai}
                    actionLabel="Analyse with"
                    pending={tool.analyzing}
                    onConfirm={tool.analyzeWith}
                    onClose={tool.closePicker}
                />
            )}
        </div>
    );
}
