"use client";

import { useState } from "react";

import { downloadDocx, downloadPdf, needsBrowserPdf, printPdf, type DocumentMeta } from "../lib/export-document";

/**
 * A result's PDF and Word buttons: which one is working, and a failure
 * message if a file couldn't be made. All in the browser (`export-document.ts`).
 */
export function useDocumentExport(letter: string, meta: DocumentMeta) {
  const [working, setWorking] = useState<"pdf" | "docx" | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** A document in a script jsPDF can't draw goes through the print dialog; the button says so. */
  const pdfViaPrint = needsBrowserPdf(letter);

  async function run(kind: "pdf" | "docx") {
    if (working) return;
    setWorking(kind);
    setError(null);
    try {
      if (kind === "docx") await downloadDocx(letter, meta);
      else if (pdfViaPrint) printPdf(letter, meta);
      else await downloadPdf(letter, meta);
    } catch {
      setError(`Couldn't make the ${kind === "pdf" ? "PDF" : "Word file"}. Copy the text instead, or try again.`);
    } finally {
      setWorking(null);
    }
  }

  return {
    pdfViaPrint,
    working,
    error,
    savePdf: () => run("pdf"),
    saveDocx: () => run("docx"),
  };
}
