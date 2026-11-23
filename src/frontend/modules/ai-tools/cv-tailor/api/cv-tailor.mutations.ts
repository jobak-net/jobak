"use client";

import { useGenericMutation } from "@/frontend/shared/api";

import { analyzeCvFit, tailorCv } from "./cv-tailor.api";

/** Analyses how one CV fits one job. Rejects with an `ApiError` whose `message` is what to show. */
export const useAnalyzeCvFit = () => useGenericMutation({ mutationFn: analyzeCvFit });

/** Writes the tailored CV after the analysis. Rejects with an `ApiError`. */
export const useTailorCv = () => useGenericMutation({ mutationFn: tailorCv });
