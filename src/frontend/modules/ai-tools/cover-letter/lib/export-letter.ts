/**
 * Saves the letter as a PDF or Word file, entirely in the browser — the
 * server isn't involved. Each library is loaded only when its button is
 * pressed (`import()`), so the page doesn't carry them.
 *
 *  - Word: `docx` builds a real .docx. Right-to-left scripts (Arabic, Hebrew)
 *    get right-to-left paragraphs, and Word shapes the letters itself.
 *  - PDF: `jsPDF` writes it directly. Its built-in fonts only cover Latin
 *    script, so a letter in another script (e.g. Arabic, when the posting
 *    was) goes through the browser's own "Save as PDF" instead, which renders
 *    every script correctly — with the browser's header and footer turned off.
 *
 * Every export first replaces typography a person doesn't type
 * (`normalizeTypography`: non-breaking hyphens, thin spaces…). Models emit it,
 * and a single non-breaking hyphen used to send an English letter to the
 * print dialog.
 */

import { normalizeTypography } from "@/shared/ai-tools";


export interface LetterMeta {
  name: string;
  company: string;
}

/** Characters jsPDF's standard fonts can draw: Latin-1 plus the usual typographic punctuation. */
const PDF_SAFE = /^[\u0000-ÿ–—‘’‚“”„•…€\s]*$/;
const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

/** "Cover letter - Talabat - Hamdy Emad.pdf", without characters file systems refuse. */
export function letterFileName(meta: LetterMeta, extension: "pdf" | "docx"): string {
  const parts = ["Cover letter", meta.company.trim(), meta.name.trim()].filter(Boolean);
  const base = parts.join(" - ").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").slice(0, 120);
  return `${base}.${extension}`;
}

/** Whether the PDF must go through the browser's print dialog (a script jsPDF's fonts can't draw). */
export function needsBrowserPdf(letter: string): boolean {
  return !PDF_SAFE.test(normalizeTypography(letter));
}

/** Paragraphs (split on blank lines), each a list of its lines (the sign-off keeps its line break). */
function paragraphs(letter: string): string[][] {
  return normalizeTypography(letter)
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);
}

function save(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A4 PDF with jsPDF: 25 mm margins, 11 pt Helvetica, paragraphs spaced, pages broken as needed. */
export async function downloadPdf(letter: string, meta: LetterMeta): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 25;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const bottom = doc.internal.pageSize.getHeight() - margin;
  const fontSize = 11;
  const lineHeight = fontSize * 0.3528 * 1.5; // pt → mm, 1.5 line spacing

  doc.setProperties({ title: letterFileName(meta, "pdf").replace(/\.pdf$/, ""), author: meta.name });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);

  let y = margin;
  for (const lines of paragraphs(letter)) {
    for (const line of lines) {
      for (const row of doc.splitTextToSize(line, width) as string[]) {
        if (y + lineHeight > bottom) {
          doc.addPage();
          y = margin;
        }
        doc.text(row, margin, y, { baseline: "top" });
        y += lineHeight;
      }
    }
    y += lineHeight * 0.7; // space between paragraphs
  }

  save(doc.output("blob"), letterFileName(meta, "pdf"));
}

/**
 * Any script: the letter in a hidden frame, printed with the browser's dialog,
 * where the user picks "Save as PDF". The frame is removed after printing.
 *
 * The browser prints its own header and footer (date, title, URL, page
 * numbers) in the page margins; a zero `@page` margin leaves them nowhere to
 * go. The 25 mm margins come back as a table whose empty header and footer
 * rows repeat on every printed page.
 */
export function printPdf(letter: string, meta: LetterMeta): void {
  const frame = Object.assign(document.createElement("iframe"), { title: "Cover letter for printing" });
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.append(frame);

  const doc = frame.contentDocument!;
  const escape = (text: string) => text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  const body = paragraphs(letter)
    .map((lines) => `<p>${lines.map(escape).join("<br>")}</p>`)
    .join("");
  const page = `<table><thead><tr><td class="gap"></td></tr></thead><tbody><tr><td>${body}</td></tr></tbody><tfoot><tr><td class="gap"></td></tr></tfoot></table>`;
  doc.open();
  doc.write(`<!doctype html><html dir="auto"><head><meta charset="utf-8"><title>${escape(letterFileName(meta, "pdf").replace(/\.pdf$/, ""))}</title>
<style>@page{size:A4;margin:0}body{font:11pt/1.5 "Segoe UI",Tahoma,Arial,sans-serif;color:#000;margin:0}table{border-collapse:collapse;width:100%}td{padding:0 25mm;vertical-align:top}td.gap{height:25mm;padding:0}p{margin:0 0 1em;unicode-bidi:plaintext}</style>
</head><body>${page}</body></html>`);
  doc.close();

  const remove = () => window.setTimeout(() => frame.remove(), 500);
  frame.contentWindow!.addEventListener("afterprint", remove, { once: true });
  frame.contentWindow!.focus();
  frame.contentWindow!.print();
  // Fallback for browsers that never fire `afterprint`: don't leave the frame behind.
  window.setTimeout(() => frame.isConnected && frame.remove(), 60_000);
}

/** A .docx with docx: Calibri 11 pt, paragraphs spaced, right-to-left when the letter is. */
export async function downloadDocx(letter: string, meta: LetterMeta): Promise<void> {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const rtl = RTL.test(letter);

  const children = paragraphs(letter).map(
    (lines) =>
      new Paragraph({
        bidirectional: rtl,
        spacing: { after: 220, line: 300 }, // 11 pt after; 1.25 line spacing
        children: lines.map(
          (line, i) => new TextRun({ text: line, break: i > 0 ? 1 : undefined, rightToLeft: rtl, font: "Calibri", size: 22 }),
        ),
      }),
  );

  const doc = new Document({
    creator: meta.name || "Jobak",
    title: letterFileName(meta, "docx").replace(/\.docx$/, ""),
    sections: [{ properties: {}, children }],
  });
  save(await Packer.toBlob(doc), letterFileName(meta, "docx"));
}
