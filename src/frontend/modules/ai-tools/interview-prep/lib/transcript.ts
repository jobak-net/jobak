/**
 * The live transcript, built from the agent's `lk.transcription` pieces. A
 * segment arrives as interim text, then once as final; both share an id.
 * One line per segment, in the order segments first appeared.
 */

export type Speaker = "interviewer" | "you";

export interface TranscriptLine {
    id: string;
    speaker: Speaker;
    text: string;
    final: boolean;
}

export interface TranscriptPiece {
    segmentId: string;
    speaker: Speaker;
    text: string;
    final: boolean;
}

export function applyTranscriptPiece(lines: TranscriptLine[], piece: TranscriptPiece): TranscriptLine[] {
    const text = piece.text.trim();
    const index = lines.findIndex((line) => line.id === piece.segmentId);
    if (index === -1) {
        return text ? [...lines, { id: piece.segmentId, speaker: piece.speaker, text, final: piece.final }] : lines;
    }
    const current = lines[index];
    // A final is the last word on a segment: an interim that arrives late never replaces it.
    if (current.final && !piece.final) return lines;
    if (!text) return lines;
    const next = [...lines];
    next[index] = { ...current, text, final: piece.final };
    return next;
}

export function transcriptText(lines: TranscriptLine[]): string {
    return lines.map((line) => `${line.speaker === "interviewer" ? "Interviewer" : "You"}: ${line.text}`).join("\n");
}
