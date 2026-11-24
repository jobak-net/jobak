/**
 * The practice interview's feedback as a PDF, made in the browser like the
 * other AI tools' documents (`../../shared/lib/export-document.ts`): jsPDF
 * for Latin script, the browser's "Save as PDF" for anything its fonts can't
 * draw (an interview held in Arabic, say). Nothing goes to a server.
 */

import { normalizeTypography } from "@/shared/ai-tools";

import { documentTitle, needsBrowserPdf, printPdf, saveBlob, documentFileName, type DocumentMeta } from "../../shared/lib/export-document";
import type { InterviewEvaluation } from "./evaluation";
import type { InterviewDetails } from "./interview-metadata";
import { transcriptText, type TranscriptLine } from "./transcript";

export interface FeedbackDocument {
    details: InterviewDetails;
    evaluation: InterviewEvaluation;
    lines: TranscriptLine[];
    candidateName: string | null;
    /** When the interview took place. */
    date: Date;
}

const dateText = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function meta(doc: FeedbackDocument): DocumentMeta {
    return {
        title: documentTitle("Interview feedback", doc.details.company, doc.details.role),
        author: doc.candidateName?.trim() || "Jobak",
    };
}

/** The whole document as plain paragraphs (blank lines between): the print fallback's content. */
export function feedbackText({ details, evaluation, lines, date }: FeedbackDocument): string {
    const parts = [
        "Interview feedback",
        [`${details.role} at ${details.company}`, dateText(date)].join("\n"),
        evaluation.score !== null ? `Score: ${evaluation.score}/10` : "",
        evaluation.summary,
        evaluation.strengths.length ? ["What went well", ...evaluation.strengths.map((s) => `• ${s}`)].join("\n") : "",
        evaluation.mistakes.length ? "Mistakes to fix" : "",
        ...evaluation.mistakes.map((m, i) =>
            [`${i + 1}.${m.said ? ` You said: "${m.said}"` : ""}`, m.why && `Why it hurts: ${m.why}`, m.better && `A better answer: ${m.better}`]
                .filter(Boolean)
                .join("\n"),
        ),
        lines.length ? "Transcript" : "",
        transcriptText(lines),
    ];
    return parts.filter((part) => part.trim()).join("\n\n");
}

/** A4, 20 mm margins: headings, the score, each mistake as a block, then the transcript. */
async function writePdf(feedback: FeedbackDocument): Promise<void> {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 20;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    const bottom = doc.internal.pageSize.getHeight() - margin;
    let y = margin;

    const write = (
        text: string,
        { size = 10.5, style = "normal", indent = 0, gray = 0, after = 1.5 }: { size?: number; style?: string; indent?: number; gray?: number; after?: number } = {},
    ) => {
        const lineHeight = size * 0.3528 * 1.45;
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        doc.setTextColor(gray);
        for (const row of doc.splitTextToSize(normalizeTypography(text), width - indent) as string[]) {
            if (y + lineHeight > bottom) {
                doc.addPage();
                y = margin;
            }
            doc.text(row, margin + indent, y, { baseline: "top" });
            y += lineHeight;
        }
        y += after;
    };
    const heading = (text: string) => {
        y += 4;
        write(text, { size: 13, style: "bold", after: 2.5 });
    };

    const { details, evaluation, lines, date } = feedback;
    doc.setProperties({ title: meta(feedback).title, author: meta(feedback).author });

    write("Interview feedback", { size: 20, style: "bold", after: 2 });
    write(`${details.role} at ${details.company}`, { size: 11, gray: 90, after: 0.5 });
    write(dateText(date), { size: 10, gray: 120, after: 5 });
    if (evaluation.score !== null) write(`Score: ${evaluation.score}/10`, { size: 15, style: "bold", after: 3 });
    if (evaluation.summary) write(evaluation.summary, { after: 2 });

    if (evaluation.strengths.length) {
        heading("What went well");
        for (const strength of evaluation.strengths) write(`•  ${strength}`, { indent: 2 });
    }

    if (evaluation.mistakes.length) {
        heading("Mistakes to fix");
        evaluation.mistakes.forEach((mistake, i) => {
            write(`${i + 1}. ${mistake.said ? `You said: "${mistake.said}"` : "Mistake"}`, { style: mistake.said ? "italic" : "bold", after: 1 });
            if (mistake.why) write(`Why it hurts: ${mistake.why}`, { indent: 5, after: 1 });
            if (mistake.better) write(`A better answer: ${mistake.better}`, { indent: 5, after: 1 });
            y += 2.5;
        });
    }

    if (lines.length) {
        heading("Transcript");
        for (const line of lines) {
            write(`${line.speaker === "interviewer" ? "Interviewer" : "You"}: ${line.text}`, { size: 9.5, gray: 60, after: 1.2 });
        }
    }

    saveBlob(doc.output("blob"), documentFileName(meta(feedback), "pdf"));
}

/** Saves the feedback as a PDF (or opens the print dialog for scripts jsPDF can't draw). */
export async function downloadFeedbackPdf(feedback: FeedbackDocument): Promise<void> {
    const text = feedbackText(feedback);
    if (needsBrowserPdf(text)) {
        printPdf(text, meta(feedback));
        return;
    }
    await writePdf(feedback);
}
