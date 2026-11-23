"use client";

import { useGenericMutation } from "@/frontend/shared/api";

import { deleteCv, saveApplicantName, saveCv } from "./applicant.api";

/** Saves a CV the user just used. Rejects with an `ApiError`. */
export const useSaveCv = () => useGenericMutation({ mutationFn: saveCv });

/** Deletes a saved CV. Rejects with an `ApiError`. */
export const useDeleteCv = () => useGenericMutation({ mutationFn: deleteCv });

/** Saves the name the user writes on applications. Rejects with an `ApiError`. */
export const useSaveApplicantName = () => useGenericMutation({ mutationFn: saveApplicantName });
