"use client";

import { useGenericMutation } from "@/frontend/shared/api";

import { improveCv, reviewCv } from "./cv-review.api";

/** Reviews one CV. Rejects with an `ApiError` whose `message` is what to show. */
export const useReviewCv = () => useGenericMutation({ mutationFn: reviewCv });

/** Writes the improved CV after a review. Rejects with an `ApiError`. */
export const useImproveCv = () => useGenericMutation({ mutationFn: improveCv });
