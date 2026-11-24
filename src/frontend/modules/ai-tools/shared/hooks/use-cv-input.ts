"use client";

import { useState } from "react";

import type { SavedCv } from "@/shared/contracts/applicant";
import { CV_REVIEW_LIMITS as L, type CvInput } from "@/shared/contracts/cv-review";

import { CvFileError, readCvFile, type CvFileKind } from "../lib/read-cv-file";
import { useSavedCvs } from "./use-saved-cvs";

export type CvInputMode = "saved" | "file" | "text";

export interface CvFileInfo {
  name: string;
  kind: CvFileKind;
  pages?: number;
}

/**
 * The CV an AI tool runs on, the same in every tool (CV review, CV tailoring):
 *
 *  - one of the user's saved CVs (the default when they have one), a PDF or
 *    Word file read into text in the browser (`readCvFile`: nothing is
 *    uploaded; a PDF over two pages is refused), or pasted text. Every way,
 *    the text is shown and editable: it's exactly what the AI reads;
 *  - `remember` keeps the CV a tool ran on for next time
 *    (`useSavedCvs().remember`): the same text again only moves it to the top.
 *
 * `onChange` runs when the CV changes, so the tool can clear its own error.
 */
export function useCvInput(savedInitial: SavedCv[], onChange?: () => void) {
  const saved = useSavedCvs(savedInitial);
  const first = savedInitial[0] ?? null;
  const [mode, setMode] = useState<CvInputMode>(first ? "saved" : "file");
  const [selected, setSelected] = useState<SavedCv | null>(first);
  const [file, setFile] = useState<CvFileInfo | null>(null);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [text, setTextState] = useState(first?.text ?? "");

  const length = text.trim().length;
  const tooShort = length < L.cvMin;
  const tooLong = length > L.cvMax;

  function setText(value: string) {
    setTextState(value);
    onChange?.();
  }

  /** The CV as it stands: its text, and where it came from. */
  function current(): CvInput {
    const origin = mode === "saved" && selected ? { source: selected.source, pages: selected.pages ?? undefined } : null;
    const source = origin?.source ?? (file ? file.kind : "text");
    const pages = origin ? origin.pages : file?.pages;
    return { text: text.trim(), source, ...(source === "pdf" && pages && { pages }) };
  }

  /** What the saved copy is called: the saved CV's own name (marked if edited), the file's, or "Pasted CV". */
  function labelFor(cvText: string): string {
    if (mode === "saved" && selected) {
      return selected.text.trim() === cvText ? selected.label : `${selected.label} (edited)`.slice(0, 120);
    }
    return (file?.name ?? "Pasted CV").slice(0, 120);
  }

  /** Keeps this CV for next time, in the background. */
  function remember(cv: CvInput) {
    saved.remember({ label: labelFor(cv.text), cv });
  }

  async function chooseFile(chosen: File | null) {
    setFileError(null);
    onChange?.();
    if (!chosen) {
      setFile(null);
      setTextState("");
      return;
    }
    setReading(true);
    try {
      const result = await readCvFile(chosen);
      setFile({ name: chosen.name, kind: result.kind, pages: result.pages });
      setTextState(result.text);
    } catch (failure) {
      setFile(null);
      setTextState("");
      setFileError(failure instanceof CvFileError ? failure.message : "This file couldn't be read. Paste the text instead.");
    } finally {
      setReading(false);
    }
  }

  function selectSaved(cv: SavedCv) {
    setSelected(cv);
    setText(cv.text);
  }

  function switchMode(next: CvInputMode) {
    if (next === mode) return;
    setMode(next);
    setFileError(null);
    setFile(null);
    // Each way in starts the field over: a saved CV fills it, a file or paste starts empty.
    const pick = next === "saved" ? (saved.cvs[0] ?? null) : null;
    setSelected(pick);
    setText(pick?.text ?? "");
  }

  function removeSaved(id: string) {
    saved.remove(id);
    if (selected?.id !== id) return;
    const next = saved.cvs.find((cv) => cv.id !== id) ?? null;
    setSelected(next);
    setText(next?.text ?? "");
    if (!next) setMode("file");
  }

  return {
    mode,
    switchMode,
    savedCvs: saved.cvs,
    savedError: saved.error,
    selectedId: selected?.id ?? null,
    selectSaved,
    removeSaved,
    file,
    reading,
    fileError,
    chooseFile,
    text,
    setText,
    length,
    tooShort,
    tooLong,
    /** Text the AI can take: not still being read, and within the limits. */
    ready: !reading && !tooShort && !tooLong,
    current,
    remember,
  };
}

export type CvInputState = ReturnType<typeof useCvInput>;
