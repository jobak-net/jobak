/**
 * A CV as a designed PDF or Word file, in the browser, from its layout
 * (`parseCv`): the name large, a spaced-capitals headline, bold contact lines,
 * section headings with a rule under them, "Company | Title" with the dates
 * right-aligned, round bullets. Simple on purpose: ATS software reads one
 * column of real text, standard headings, and real bullet lists, and trips on
 * tables, columns and graphics, so there are none.
 *
 *  - PDF: jsPDF, Helvetica (Latin script). Another script goes through the
 *    browser's "Save as PDF" with the same design in HTML (`cvDocumentHtml`).
 *  - Word: docx, Arial; dates on a right tab stop (not a table), bullets as a
 *    real numbered list, headings with a bottom border. Right-to-left scripts
 *    get right-to-left paragraphs.
 */

import { cvDocumentHtml, parseCv, type CvLayout } from "./cv-layout";
import { documentFileName, saveBlob, type DocumentMeta } from "./export-document";

const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

/** pt → mm. */
const MM = 0.3528;

/** The CV as an A4 PDF: 18 mm side margins, 16 mm top and bottom. */
export async function downloadCvPdf(text: string, meta: DocumentMeta): Promise<void> {
  const layout = parseCv(text);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const left = 18;
  const right = doc.internal.pageSize.getWidth() - 18;
  const width = right - left;
  const top = 16;
  const bottom = doc.internal.pageSize.getHeight() - 16;
  let y = top;

  doc.setProperties({ title: documentFileName(meta, "pdf").replace(/\.pdf$/, ""), author: meta.author });

  const font = (size: number, weight: "normal" | "bold") => {
    doc.setFont("helvetica", weight);
    doc.setFontSize(size);
  };
  const lineHeight = (size: number) => size * MM * 1.35;
  /** Starts a new page when `height` doesn't fit. */
  const room = (height: number) => {
    if (y + height > bottom) {
      doc.addPage();
      y = top;
    }
  };
  const lines = (text: string, size: number, weight: "normal" | "bold", x: number, w: number) => {
    font(size, weight);
    for (const row of doc.splitTextToSize(text, w) as string[]) {
      room(lineHeight(size));
      doc.text(row, x, y, { baseline: "top" });
      y += lineHeight(size);
    }
  };

  // Header.
  if (layout.name) lines(layout.name, 22, "bold", left, width);
  if (layout.headline) {
    y += 1;
    font(11, "normal");
    doc.setCharSpace(0.5);
    doc.text(layout.headline.toUpperCase(), left, y, { baseline: "top" });
    doc.setCharSpace(0);
    y += lineHeight(11) + 1.5;
  }
  for (const contact of layout.contact) lines(contact, 9.5, "bold", left, width);

  for (const section of layout.sections) {
    // Keep a heading with at least a couple of lines under it.
    room(lineHeight(12) + 3 + lineHeight(10) * 2);
    y += 4;
    lines(section.heading, 12, "bold", left, width);
    doc.setLineWidth(0.25);
    doc.line(left, y + 0.6, right, y + 0.6);
    y += 2.6;

    for (const item of section.items) {
      if (item.kind === "entry") {
        y += 1.5;
        font(10, "bold");
        const dateWidth = item.date ? doc.getTextWidth(item.date) + 5 : 0;
        const rows = (item.title ? doc.splitTextToSize(item.title, width - dateWidth) : [""]) as string[];
        room(lineHeight(10) * rows.length);
        if (item.date) doc.text(item.date, right, y, { baseline: "top", align: "right" });
        for (const row of rows) {
          doc.text(row, left, y, { baseline: "top" });
          y += lineHeight(10);
        }
        y += 0.5;
      } else if (item.kind === "bullet") {
        font(10, "normal");
        const rows = doc.splitTextToSize(item.text, width - 7) as string[];
        room(lineHeight(10));
        doc.text("•", left + 2.5, y, { baseline: "top" });
        for (const row of rows) {
          room(lineHeight(10));
          doc.text(row, left + 7, y, { baseline: "top" });
          y += lineHeight(10);
        }
        y += 0.6;
      } else {
        lines(item.text, 10, "normal", left, width);
        y += 0.8;
      }
    }
  }

  saveBlob(doc.output("blob"), documentFileName(meta, "pdf"));
}

/** Any script: the same design in HTML, printed with the browser's dialog ("Save as PDF"). */
export function printCvPdf(text: string, meta: DocumentMeta): void {
  const frame = Object.assign(document.createElement("iframe"), { title: "CV for printing" });
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.append(frame);

  const doc = frame.contentDocument!;
  doc.open();
  doc.write(cvDocumentHtml(parseCv(text), { title: documentFileName(meta, "pdf").replace(/\.pdf$/, ""), print: true }));
  doc.close();

  const remove = () => window.setTimeout(() => frame.remove(), 500);
  frame.contentWindow!.addEventListener("afterprint", remove, { once: true });
  frame.contentWindow!.focus();
  frame.contentWindow!.print();
  window.setTimeout(() => frame.isConnected && frame.remove(), 60_000);
}

/** The CV as a .docx: Arial, the same sizes as the PDF. */
export async function downloadCvDocx(text: string, meta: DocumentMeta): Promise<void> {
  const layout: CvLayout = parseCv(text);
  const { AlignmentType, BorderStyle, Document, LevelFormat, Packer, Paragraph, Tab, TabStopPosition, TabStopType, TextRun } =
    await import("docx");
  const rtl = RTL.test(text);
  const run = (value: string, options: { size: number; bold?: boolean; allCaps?: boolean; characterSpacing?: number }) =>
    new TextRun({ text: value, font: "Arial", rightToLeft: rtl, ...options });
  // Sizes in half-points: 10 pt is 20.
  const children: InstanceType<typeof Paragraph>[] = [];

  if (layout.name) children.push(new Paragraph({ bidirectional: rtl, children: [run(layout.name, { size: 44, bold: true })] }));
  if (layout.headline) {
    children.push(
      new Paragraph({
        bidirectional: rtl,
        spacing: { before: 40, after: 40 },
        children: [run(layout.headline, { size: 22, allCaps: true, characterSpacing: 30 })],
      }),
    );
  }
  for (const contact of layout.contact) {
    children.push(new Paragraph({ bidirectional: rtl, children: [run(contact, { size: 19, bold: true })] }));
  }

  for (const section of layout.sections) {
    children.push(
      new Paragraph({
        bidirectional: rtl,
        keepNext: true,
        spacing: { before: 220, after: 100 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "111111", space: 2 } },
        children: [run(section.heading, { size: 24, bold: true })],
      }),
    );
    for (const item of section.items) {
      if (item.kind === "entry") {
        children.push(
          new Paragraph({
            bidirectional: rtl,
            keepNext: true,
            spacing: { before: 100, after: 40 },
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            children: [
              run(item.title, { size: 20, bold: true }),
              ...(item.date ? [new TextRun({ children: [new Tab(), item.date], bold: true, size: 20, font: "Arial", rightToLeft: rtl })] : []),
            ],
          }),
        );
      } else if (item.kind === "bullet") {
        children.push(
          new Paragraph({
            bidirectional: rtl,
            numbering: { reference: "cv-bullets", level: 0 },
            spacing: { after: 30 },
            children: [run(item.text, { size: 20 })],
          }),
        );
      } else {
        children.push(new Paragraph({ bidirectional: rtl, spacing: { after: 60 }, children: [run(item.text, { size: 20 })] }));
      }
    }
  }

  const doc = new Document({
    creator: meta.author || "Jobak",
    title: documentFileName(meta, "docx").replace(/\.docx$/, ""),
    numbering: {
      config: [
        {
          reference: "cv-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 400, hanging: 260 } } },
            },
          ],
        },
      ],
    },
    // A4 with 18 mm sides and 16 mm top and bottom, in twentieths of a point.
    sections: [{ properties: { page: { margin: { top: 907, bottom: 907, left: 1020, right: 1020 } } }, children }],
  });
  saveBlob(await Packer.toBlob(doc), documentFileName(meta, "docx"));
}
