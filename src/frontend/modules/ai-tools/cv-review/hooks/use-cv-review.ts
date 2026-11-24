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
import { useCvInput } from "../../shared/hooks/use-cv-input";

/**
 * The CV review tool's state.
 *
 *  - **The CV** (`useCvInput`, shared with CV tailoring): a saved CV, a file
 *    read in the browser, or pasted text; kept for next time when reviewed.
 *  - **The target role** starts from Preferences and can be changed.
 *  - **Review** opens the provider popup; confirming sends the text.
 *  - **Improve** comes after the review, when the user asks, on the same
 *    provider, with the reviewed CV and the review's findings and scores sent
 *    back (the server keeps nothing). The improved CV is editable in place.
 */
export function useCvReview(defaults: { targetRole: string }, savedInitial: SavedCv[]) {
  const [error, setError] = useState<string | null>(null);
  const cv = useCvInput(savedInitial, () => setError(null));
  const [targetRole, setTargetRole] = useState(defaults.targetRole);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [review, setReview] = useState<CvReviewResponse | null>(null);
  /** The CV the review was made on: the improvement and the highlights use it, even if the field changes since. */
  const [reviewed, setReviewed] = useState<CvInput | null>(null);
  const [improved, setImproved] = useState<CvImproveResponse | null>(null);
  const [improvedText, setImprovedText] = useState("");
  const [improveError, setImproveError] = useState<string | null>(null);
  const reviewCv = useReviewCv();
  const improveCv = useImproveCv();

  const canReview = cv.ready && !reviewCv.isPending;

  function reviewWith(provider: AiProvider) {
    setError(null);
    const input = cv.current();
    // Kept for next time while the review runs; doesn't hold it up.
    cv.remember(input);
    reviewCv.mutate(
      { provider, cv: input, targetRole: targetRole.trim() },
      {
        onSuccess: (response) => {
          setReview(response);
          setReviewed(input);
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
    cv,
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
