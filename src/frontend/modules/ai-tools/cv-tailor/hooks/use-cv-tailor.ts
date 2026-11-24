"use client";

import { useMemo, useState } from "react";

import type { AiProvider } from "@/frontend/modules/onboarding";
import { errorMessageOf } from "@/frontend/shared/api";
import { scanJobPosting } from "@/shared/ai-tools";
import type { SavedCv } from "@/shared/contracts/applicant";
import type { CvInput } from "@/shared/contracts/cv-review";
import {
  CV_TAILOR_LIMITS as L,
  type CvFitResponse,
  type CvTailorResponse,
  type FitCategoryId,
  type TailorJob,
} from "@/shared/contracts/cv-tailor";

import { useAnalyzeCvFit, useTailorCv } from "../api/cv-tailor.mutations";
import { useCvInput } from "../../shared/hooks/use-cv-input";

/**
 * The CV tailoring tool's state.
 *
 *  - **The CV** (`useCvInput`, shared with CV review): a saved CV, a file read
 *    in the browser, or pasted text; kept for next time when analysed.
 *  - **The job**: the posting (required) and, optionally, the company and
 *    title. The posting is checked as it's pasted (`scanJobPosting`, shared
 *    with the server), so text planted for AI tools shows before anything is
 *    sent.
 *  - **Analyse** opens the provider popup; the analysis shows the match and
 *    each requirement against the CV.
 *  - **Tailor** comes after, when the user asks, on the same provider, with
 *    the analysed CV, job and findings sent back (the server keeps nothing).
 *    The tailored CV is editable in place.
 */
export function useCvTailor(savedInitial: SavedCv[]) {
  const [error, setError] = useState<string | null>(null);
  const cv = useCvInput(savedInitial, () => setError(null));
  const [job, setJob] = useState<TailorJob>({ company: "", title: "", description: "" });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fit, setFit] = useState<CvFitResponse | null>(null);
  /** What the analysis was made on: the tailoring and the evidence use it, even if the fields change since. */
  const [analysed, setAnalysed] = useState<{ cv: CvInput; job: TailorJob } | null>(null);
  const [tailored, setTailored] = useState<CvTailorResponse | null>(null);
  const [tailoredText, setTailoredText] = useState("");
  const [tailorError, setTailorError] = useState<string | null>(null);
  const analyze = useAnalyzeCvFit();
  const tailor = useTailorCv();

  const scan = useMemo(() => scanJobPosting(job.description), [job.description]);
  const descriptionLength = job.description.trim().length;
  const postingTooShort = descriptionLength < L.descriptionMin;
  const postingTooLong = descriptionLength > L.descriptionMax;
  const canAnalyze = cv.ready && !postingTooShort && !postingTooLong && !analyze.isPending;

  function setJobField<K extends keyof TailorJob>(key: K, value: TailorJob[K]) {
    setJob((all) => ({ ...all, [key]: value }));
    setError(null);
  }

  function analyzeWith(provider: AiProvider) {
    setError(null);
    const input = { cv: cv.current(), job: { company: job.company.trim(), title: job.title.trim(), description: job.description } };
    // Kept for next time while the analysis runs; doesn't hold it up.
    cv.remember(input.cv);
    analyze.mutate(
      { provider, ...input },
      {
        onSuccess: (response) => {
          setFit(response);
          setAnalysed(input);
          setTailored(null);
          setTailoredText("");
          setTailorError(null);
          setPickerOpen(false);
        },
        onError: (failure) => {
          setError(errorMessageOf(failure));
          setPickerOpen(false);
        },
      },
    );
  }

  function tailorIt() {
    if (!fit || !analysed || tailor.isPending) return;
    setTailorError(null);
    tailor.mutate(
      {
        provider: fit.provider,
        ...analysed,
        focus: focusFrom(fit),
        originalScores: Object.fromEntries(fit.categories.map((c) => [c.id, c.score])) as Record<FitCategoryId, number>,
      },
      {
        onSuccess: (response) => {
          setTailored(response);
          setTailoredText(response.cv);
        },
        onError: (failure) => setTailorError(errorMessageOf(failure)),
      },
    );
  }

  return {
    cv,
    job,
    setJobField,
    scan,
    descriptionLength,
    postingTooShort,
    postingTooLong,
    canAnalyze,
    pickerOpen,
    openPicker: () => canAnalyze && setPickerOpen(true),
    closePicker: () => setPickerOpen(false),
    analyzeWith,
    analyzing: analyze.isPending,
    error,
    fit,
    analysed,
    tailor: tailorIt,
    tailoring: tailor.isPending,
    tailorError,
    tailored,
    /** The tailored CV as the user edits it. */
    tailoredText,
    setTailoredText,
  };
}

/** What the tailoring should work from: the positioning, then each requirement with how the CV meets it. */
function focusFrom(fit: CvFitResponse): string[] {
  const items = [
    fit.positioning && `Positioning: ${fit.positioning}`,
    ...fit.requirements.map((r) => `${r.requirement} (${r.priority}, ${r.type}): ${r.match}${r.evidence ? `, shown by "${r.evidence}"` : ""}`),
  ];
  return items
    .filter((item): item is string => Boolean(item))
    .map((item) => item.trim().slice(0, L.focusItemChars))
    .slice(0, L.focusItems);
}
