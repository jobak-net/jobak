"use client";

import { useState } from "react";

import type { AiProvider } from "@/frontend/modules/onboarding";
import { errorMessageOf } from "@/frontend/shared/api";
import type { SavedCv } from "@/shared/contracts/applicant";
import {
  CV_REVIEW_LIMITS as L,
  type CvCategoryId,
  type CvImproveResponse,
  type CvInput,
  type CvReviewResponse,
} from "@/shared/contracts/cv-review";

import { useImproveCv, useReviewCv } from "../api/cv-review.mutations";
import { CvFileError, readCvFile, type CvFileKind } from "../lib/read-cv-file";
import { useSavedCvs } from "../../shared/hooks/use-saved-cvs";

export type CvInputMode = "saved" | "file" | "text";

export interface CvFileInfo {
  name: string;
  kind: CvFileKind;
  pages?: number;
}

/**
 * The CV review tool's state.
 *
 *  - **The CV**: one of the user's saved CVs (the default when they have
 *    one), a PDF or Word file read into text in the browser (`readCvFile`:
 *    nothing is uploaded; a PDF over two pages is refused), or pasted text.
 *    Either way the text is shown and editable: it's exactly what the AI reads.
 *  - **Saved for next time**: the CV a review runs on is saved
 *    (`useSavedCvs().remember`), so the user gives it once; the same text
 *    again only moves it to the top.
 *  - **The target role** starts from Preferences and can be changed.
 *  - **Review** opens the provider popup; confirming sends the text.
 *  - **Improve** comes after the review, when the user asks, on the same
 *    provider, with the reviewed CV and the review's findings and scores sent
 *    back (the server keeps nothing). The improved CV is editable in place.
 */
export function useCvReview(defaults: { targetRole: string }, savedInitial: SavedCv[]) {
  const saved = useSavedCvs(savedInitial);
  const first = savedInitial[0] ?? null;
  const [mode, setMode] = useState<CvInputMode>(first ? "saved" : "file");
  const [selected, setSelected] = useState<SavedCv | null>(first);
  const [file, setFile] = useState<CvFileInfo | null>(null);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [text, setText] = useState(first?.text ?? "");
  const [targetRole, setTargetRole] = useState(defaults.targetRole);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [review, setReview] = useState<CvReviewResponse | null>(null);
  /** The CV the review was made on: the improvement and the highlights use it, even if the field changes since. */
  const [reviewed, setReviewed] = useState<CvInput | null>(null);
  const [improved, setImproved] = useState<CvImproveResponse | null>(null);
  const [improvedText, setImprovedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [improveError, setImproveError] = useState<string | null>(null);
  const reviewCv = useReviewCv();
  const improveCv = useImproveCv();

  const length = text.trim().length;
  const tooShort = length < L.cvMin;
  const tooLong = length > L.cvMax;
  const canReview = !reading && !tooShort && !tooLong && !reviewCv.isPending;

  /** The CV as it stands: its text, and where it came from. */
  function currentCv(): CvInput {
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

  async function chooseFile(chosen: File | null) {
    setFileError(null);
    setError(null);
    if (!chosen) {
      setFile(null);
      setText("");
      return;
    }
    setReading(true);
    try {
      const result = await readCvFile(chosen);
      setFile({ name: chosen.name, kind: result.kind, pages: result.pages });
      setText(result.text);
    } catch (failure) {
      setFile(null);
      setText("");
      setFileError(failure instanceof CvFileError ? failure.message : "This file couldn't be read. Paste the text instead.");
    } finally {
      setReading(false);
    }
  }

  function selectSaved(cv: SavedCv) {
    setSelected(cv);
    setText(cv.text);
    setError(null);
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

  function reviewWith(provider: AiProvider) {
    setError(null);
    const cv = currentCv();
    // Kept for next time while the review runs; doesn't hold it up.
    saved.remember({ label: labelFor(cv.text), cv });
    reviewCv.mutate(
      { provider, cv, targetRole: targetRole.trim() },
      {
        onSuccess: (response) => {
          setReview(response);
          setReviewed(cv);
          setImproved(null);
          setImprovedText("");
          setImproveError(null);
          setPickerOpen(false);
        },
        onError: (failure) => {
          setError(errorMessageOf(failure));
          setPickerOpen(false);
        },
      },
    );
  }

  function improve() {
    if (!review || !reviewed || improveCv.isPending) return;
    setImproveError(null);
    improveCv.mutate(
      {
        provider: review.provider,
        cv: reviewed,
        targetRole: review.targetRole,
        focus: focusFrom(review),
        originalScores: Object.fromEntries(review.categories.map((c) => [c.id, c.score])) as Record<CvCategoryId, number>,
      },
      {
        onSuccess: (response) => {
          setImproved(response);
          setImprovedText(response.cv);
        },
        onError: (failure) => setImproveError(errorMessageOf(failure)),
      },
    );
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
    setText: (value: string) => {
      setText(value);
      setError(null);
    },
    length,
    tooShort,
    tooLong,
    targetRole,
    setTargetRole,
    canReview,
    pickerOpen,
    openPicker: () => canReview && setPickerOpen(true),
    closePicker: () => setPickerOpen(false),
    reviewWith,
    reviewing: reviewCv.isPending,
    error,
    review,
    reviewedText: reviewed?.text ?? "",
    improve,
    improving: improveCv.isPending,
    improveError,
    improved,
    /** The improved CV as the user edits it. */
    improvedText,
    setImprovedText,
  };
}

/** What the improvement should fix, from the review: each issue with its suggestion, then the weaknesses. */
function focusFrom(review: CvReviewResponse): string[] {
  const items = [
    ...review.issues.map((i) => `${i.quote ? `"${i.quote}": ` : ""}${i.issue} ${i.suggestion}`),
    ...review.weaknesses,
  ];
  return items.map((item) => item.trim().slice(0, L.focusItemChars)).filter(Boolean).slice(0, L.focusItems);
}
