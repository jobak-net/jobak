/**
 * A CV's plain text read as a document: the name, a headline, contact lines,
 * then sections of entries ("Company | Title" with its dates), bullets and
 * paragraphs. The PDF, the Word file and the preview all draw from this, in
 * the same simple, ATS-friendly design: one column, real text, standard
 * headings with a rule under each, dates right-aligned, round bullets. No
 * tables, columns, icons or graphics, which is what ATS parsers trip on.
 *
 * The text is what the AI wrote and the user edited, so reading it is
 * forgiving: anything the rules below don't recognise is kept as a paragraph,
 * never dropped.
 */

import { normalizeTypography } from "@/shared/ai-tools";

export type CvItem =
  | { kind: "entry"; title: string; date: string | null }
  | { kind: "bullet"; text: string }
  | { kind: "text"; text: string };

export interface CvSection {
  heading: string;
  items: CvItem[];
}

export interface CvLayout {
  name: string;
  /** "Software Engineer": the line under the name, when there is one. */
  headline: string | null;
  /** Location, phone, email, links: one or two lines, as written. */
  contact: string[];
  sections: CvSection[];
}

/** Section headings people use, in lower case, without a trailing colon. */
const HEADINGS = new Set(
  [
    "summary", "professional summary", "profile", "professional profile", "about", "about me", "objective", "career objective",
    "experience", "professional experience", "work experience", "employment", "employment history", "work history",
    "projects", "personal projects", "key projects", "selected projects",
    "education", "academic background", "courses", "training", "certifications", "certificates", "licenses",
    "certifications and courses", "courses and certifications",
    "skills", "technical skills", "skills & abilities", "skills and abilities", "core skills", "key skills", "core competencies",
    "languages", "awards", "achievements", "honors", "publications", "volunteering", "volunteer experience",
    "interests", "references", "activities", "leadership",
  ],
);

const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const POINT = `(?:${MONTH}\\s+\\d{4}|\\d{1,2}/\\d{4}|\\d{4}|present|current|now|today)`;
const RANGE = `${POINT}(?:\\s*(?:[-–—]|to)\\s*${POINT})?`;
/** A line that is only a date or a date range: "March 2023 – Present", "11/2024 – 11/2025", "2021". */
const DATE_LINE = new RegExp(`^${RANGE}$`, "i");
/** A line ending in a full date range after a space: "DBInvesting | Software Engineer 11/2025 – Present". */
const RANGE_END = new RegExp(`^(.*?\\S)\\s+(${POINT}\\s*(?:[-–—]|to)\\s*${POINT})$`, "i");
/** A line ending in a date after a separator: "Cairo University, 2021", "Nilepay | Engineer | 2021". */
const DATE_END = new RegExp(`^(.*?\\S)\\s*[,|–—-]\\s*(${RANGE})$`, "i");

/** An entry line's title and dates, when it ends with dates. */
function splitDate(line: string): { title: string; date: string } | null {
  const m = RANGE_END.exec(line) ?? DATE_END.exec(line);
  return m ? { title: m[1]!.replace(/[\s,|–—-]+$/, "").trim(), date: m[2]!.trim() } : null;
}
const BULLET = /^\s*(?:[-•*▪●◦]|–(?=\s))\s+/;
/** What marks a header line as contact details rather than a headline. */
const CONTACT = /@|https?:\/\/|www\.|linkedin|github|\+?\d[\d\s().-]{6,}\d|\|/i;

/**
 * A section heading: a known name, or (after the header) a short all-capitals
 * line without digits ("WORK HISTORY"). In the header, a capitals line is the
 * headline ("SOFTWARE ENGINEER"), so only known names count there.
 */
function isHeading(line: string, inHeader: boolean): boolean {
  const bare = line.replace(/:$/, "").trim();
  if (!bare || bare.length > 40 || BULLET.test(line)) return false;
  if (HEADINGS.has(bare.toLowerCase())) return true;
  return !inHeader && /^[\p{Lu}][\p{Lu}\s&/]+$/u.test(bare) && bare.split(/\s+/).length <= 4;
}

/** The CV's text as a layout. */
export function parseCv(text: string): CvLayout {
  const lines = normalizeTypography(text)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim());

  const layout: CvLayout = { name: "", headline: null, contact: [], sections: [] };
  let section: CvSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line) continue;

    if (isHeading(line, section === null)) {
      section = { heading: line.replace(/:$/, "").trim(), items: [] };
      layout.sections.push(section);
      continue;
    }

    if (!section) {
      // The header: the name first, then a headline, then contact details.
      if (!layout.name) layout.name = line;
      else if (!layout.headline && !CONTACT.test(line) && layout.contact.length === 0) layout.headline = line;
      else layout.contact.push(line);
      continue;
    }

    if (BULLET.test(line)) {
      section.items.push({ kind: "bullet", text: line.replace(BULLET, "") });
      continue;
    }

    const previous = section.items[section.items.length - 1];
    if (DATE_LINE.test(line)) {
      // A date on its own line belongs to the entry above it.
      if (previous?.kind === "entry" && !previous.date) previous.date = line;
      else section.items.push({ kind: "entry", title: "", date: line });
      continue;
    }

    const next = lines.slice(i + 1).find(Boolean) ?? "";
    const dated = line.length <= 140 ? splitDate(line) : null;
    if (dated) {
      section.items.push({ kind: "entry", ...dated });
    } else if (BULLET.test(next) || DATE_LINE.test(next)) {
      section.items.push({ kind: "entry", title: line, date: null });
    } else {
      section.items.push({ kind: "text", text: line });
    }
  }

  return layout;
}

const escape = (text: string) =>
  text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The design, as CSS: the same sizes the PDF and Word file use. */
const CSS = `
body{font:10pt/1.4 Arial,"Segoe UI",Tahoma,sans-serif;color:#111;margin:0}
h1{font-size:22pt;line-height:1.1;font-weight:700;margin:0}
.headline{font-size:11pt;letter-spacing:.12em;text-transform:uppercase;margin:1.5mm 0 2mm}
.contact{font-size:9.5pt;font-weight:700;margin:0}
h2{font-size:12pt;font-weight:700;margin:5mm 0 2mm;padding-bottom:1mm;border-bottom:.6pt solid #111}
.entry{display:flex;justify-content:space-between;gap:6mm;font-weight:700;margin:2.5mm 0 1mm}
.entry span:last-child{white-space:nowrap}
ul{margin:0 0 1mm;padding-left:6mm}
li{margin:.7mm 0}
p{margin:1mm 0}
*{unicode-bidi:plaintext}`;

/** The layout as an HTML body (no page wrapper). */
export function cvBodyHtml(layout: CvLayout): string {
  const parts: string[] = [];
  if (layout.name) parts.push(`<h1>${escape(layout.name)}</h1>`);
  if (layout.headline) parts.push(`<p class="headline">${escape(layout.headline)}</p>`);
  for (const line of layout.contact) parts.push(`<p class="contact">${escape(line)}</p>`);

  for (const section of layout.sections) {
    parts.push(`<h2>${escape(section.heading)}</h2>`);
    let list: string[] = [];
    const flush = () => {
      if (list.length) parts.push(`<ul>${list.join("")}</ul>`);
      list = [];
    };
    for (const item of section.items) {
      if (item.kind === "bullet") {
        list.push(`<li>${escape(item.text)}</li>`);
        continue;
      }
      flush();
      if (item.kind === "entry") {
        parts.push(`<div class="entry"><span>${escape(item.title)}</span><span>${escape(item.date ?? "")}</span></div>`);
      } else {
        parts.push(`<p>${escape(item.text)}</p>`);
      }
    }
    flush();
  }
  return parts.join("");
}

/**
 * A whole HTML document of the CV. `print`: for the browser's "Save as PDF"
 * (A4, the page margins as repeating table rows so the browser's own header
 * and footer have nowhere to go). Otherwise: a sheet of paper on a grey
 * background, for the preview.
 */
export function cvDocumentHtml(layout: CvLayout, options: { title: string; print: boolean }): string {
  const body = cvBodyHtml(layout);
  const page = options.print
    ? `<table class="sheet"><thead><tr><td class="gap"></td></tr></thead><tbody><tr><td>${body}</td></tr></tbody><tfoot><tr><td class="gap"></td></tr></tfoot></table>`
    : `<main class="sheet">${body}</main>`;
  const frame = options.print
    ? `@page{size:A4;margin:0}table.sheet{border-collapse:collapse;width:100%}table.sheet td{padding:0 18mm;vertical-align:top}table.sheet td.gap{height:16mm;padding:0}`
    : `html{background:#e4e4e7}main.sheet{background:#fff;max-width:210mm;min-height:297mm;margin:0 auto;padding:16mm 18mm;box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,.25)}body{padding:6mm}`;
  return `<!doctype html><html dir="auto"><head><meta charset="utf-8"><title>${escape(options.title)}</title><style>${CSS}${frame}</style></head><body>${page}</body></html>`;
}
