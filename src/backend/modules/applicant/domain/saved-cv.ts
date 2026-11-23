import { createHash } from "node:crypto";

import type { CvSource } from "@/shared/contracts/cv-review";

/** A CV as stored: text only (a file was read in the browser). */
export interface SavedCvRecord {
  id: string;
  label: string;
  source: CvSource;
  pages: number | null;
  text: string;
  createdAt: Date;
  lastUsedAt: Date;
}

/** A CV to save. `hash` identifies its text, so the same CV is kept once. */
export interface NewCv {
  label: string;
  text: string;
  source: CvSource;
  pages: number | null;
  hash: string;
}

/** The text as it's compared and stored: line endings normalized, outer whitespace trimmed. */
export function normalizeCvText(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}

/** SHA-256 (hex) of the normalized text: the same CV pasted twice, or read from two copies of a file, is one row. */
export function cvHash(text: string): string {
  return createHash("sha256").update(normalizeCvText(text), "utf8").digest("hex");
}
