"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download } from "lucide-react";

import { Button } from "@/frontend/shared/ui";
import { cn } from "@/frontend/shared/lib";

import { transcriptText, type TranscriptLine } from "../lib/transcript";

function download(text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "interview-transcript.txt";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * What was said, both sides, as it's said; Copy and Download once the call
 * has ended. `fill`: takes the height it's given and scrolls inside (the call modal).
 */
export function TranscriptView({ lines, ended, fill = false }: { lines: TranscriptLine[]; ended: boolean; fill?: boolean }) {
    const box = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    // Keep the newest line in view inside the transcript box (not the page).
    useEffect(() => {
        const el = box.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [lines]);

    if (lines.length === 0) return null;

    async function copy() {
        try {
            await navigator.clipboard.writeText(transcriptText(lines));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard blocked: the text is selectable */
        }
    }

    return (
        <section className={cn("rounded-card border border-border-subtle bg-white/2", fill && "flex min-h-0 flex-1 flex-col")}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-3.5">
                <h2 className="text-[15px] font-semibold text-fg-primary">Transcript</h2>
                {ended && (
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={copy}>
                            {copied ? <Check /> : <Copy />}
                            {copied ? "Copied" : "Copy"}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => download(transcriptText(lines))}>
                            <Download /> Download
                        </Button>
                    </div>
                )}
            </div>
            <div ref={box} className={cn("space-y-3 overflow-y-auto px-5 py-4", fill ? "min-h-0 flex-1" : "max-h-[420px]")}>
                {lines.map((line) => (
                    <p key={line.id} className={cn("text-sm leading-relaxed", !line.final && "opacity-70")}>
                        <span className={cn("mr-2 font-medium", line.speaker === "interviewer" ? "text-accent-text" : "text-fg-secondary")}>
                            {line.speaker === "interviewer" ? "Interviewer" : "You"}
                        </span>
                        <span className="text-fg-primary">{line.text}</span>
                    </p>
                ))}
            </div>
        </section>
    );
}
