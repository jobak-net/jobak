/**
 * A CV file turned into text, entirely in the browser: the file never leaves
 * the user's machine, and the server only ever receives the text (the page
 * shows it first, so the user sees exactly what the AI reads).
 *
 *  - PDF: pdf.js (`pdfjs-dist`), its legacy build: the modern one needs
 *    JavaScript features only the newest browsers have (`Uint8Array.toHex`,
 *    missing even in a recent Chrome), which the legacy build polyfills. Its
 *    worker is loaded into the page itself
 *    (`globalThis.pdfjsWorker`), not as a separate worker file: a two-page CV
 *    is quick to parse, and it works the same under any bundler. A PDF over
 *    `maxPages` is refused before any text is read.
 *  - Word (.docx): mammoth's raw text. Word files don't record a page count
 *    reliably, so their length is bounded by the text limit instead.
 *
 * Each library is loaded only when a file of its kind is chosen (`import()`),
 * so the page doesn't carry them.
 */

import { CV_REVIEW_LIMITS as L } from "@/shared/contracts/cv-review";

export type CvFileKind = "pdf" | "docx";

export interface CvFileText {
  kind: CvFileKind;
  text: string;
  /** PDF only. */
  pages?: number;
}

/** Why a file couldn't be used, in words for the user. */
export class CvFileError extends Error {}

const MB = 1024 * 1024;

function kindOf(file: File): CvFileKind | "doc" | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "docx";
  }
  if (name.endsWith(".doc") || file.type === "application/msword") return "doc";
  return null;
}

/** Lines back from pdf.js's text items: a new line where the text says so or moves down the page. */
function pageText(items: { str?: string; hasEOL?: boolean; transform?: number[] }[]): string {
  let out = "";
  let lastY: number | null = null;
  for (const item of items) {
    if (typeof item.str !== "string") continue;
    const y = item.transform?.[5] ?? null;
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && !out.endsWith("\n")) out += "\n";
    out += item.str;
    if (item.hasEOL) out += "\n";
    if (y !== null) lastY = y;
  }
  return out;
}

async function readPdf(data: ArrayBuffer): Promise<CvFileText> {
  const [pdfjs] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    // Sets `globalThis.pdfjsWorker`, which pdf.js then runs in the page instead of a worker file.
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs"),
  ]);

  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  let doc: Awaited<typeof task.promise>;
  try {
    doc = await task.promise;
  } catch (error) {
    void task.destroy();
    console.error(`[cv-review] reading the PDF failed: ${(error as Error)?.message}`, error);
    if ((error as Error).name === "PasswordException") {
      throw new CvFileError("This PDF is password-protected. Remove the password, or paste the text instead.");
    }
    throw new CvFileError("This PDF couldn't be read. Try exporting it again, or paste the text instead.");
  }

  try {
    if (doc.numPages > L.maxPages) {
      throw new CvFileError(
        `Your CV has ${doc.numPages} pages. Keep it to ${L.maxPages} pages at most: recruiters skim, and a longer CV is often cut short. Shorten it, then upload it again.`,
      );
    }
    const pages: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      pages.push(pageText(content.items as { str?: string; hasEOL?: boolean; transform?: number[] }[]));
    }
    return { kind: "pdf", text: tidy(pages.join("\n\n")), pages: doc.numPages };
  } finally {
    void task.destroy();
  }
}

async function readDocx(data: ArrayBuffer): Promise<CvFileText> {
  // A CommonJS package: a dynamic import may hand it back under `default`, depending on the bundler.
  const loaded = await import("mammoth");
  const mammoth: Pick<typeof loaded, "extractRawText"> = loaded.default ?? loaded;
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: data });
    return { kind: "docx", text: tidy(result.value) };
  } catch (error) {
    console.error("[cv-review] reading the Word file failed", error);
    throw new CvFileError("This Word file couldn't be read. Save it again as .docx or PDF, or paste the text instead.");
  }
}

/** Spaces and blank lines as a person would leave them. */
function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * The file's text, or a `CvFileError` saying what's wrong: not a PDF or
 * .docx, over the size limit, a PDF over the page limit, a file with no text
 * in it (a scan), or one over the text limit.
 */
export async function readCvFile(file: File): Promise<CvFileText> {
  const kind = kindOf(file);
  if (kind === "doc") throw new CvFileError("Old Word files (.doc) can't be read here. Save it as .docx or PDF, or paste the text.");
  if (!kind) throw new CvFileError("Choose a PDF or a Word (.docx) file, or paste the text instead.");
  if (file.size > L.maxFileBytes) {
    throw new CvFileError(`This file is ${(file.size / MB).toFixed(1)} MB. Choose one under ${L.maxFileBytes / MB} MB.`);
  }

  const data = await file.arrayBuffer();
  const result = kind === "pdf" ? await readPdf(data) : await readDocx(data);

  if (result.text.length < L.cvMin) {
    throw new CvFileError(
      kind === "pdf"
        ? "No text could be read from this PDF. It's probably a scan or an image, which ATS software can't read either. Export it from your editor as a text PDF, or paste the text."
        : "This file has almost no text in it. Check it's your CV, or paste the text instead.",
    );
  }
  if (result.text.length > L.cvMax) {
    throw new CvFileError(
      `This CV is longer than two pages of text (${result.text.length.toLocaleString()} characters; the limit is ${L.cvMax.toLocaleString()}). Shorten it to ${L.maxPages} pages at most.`,
    );
  }
  return result;
}
