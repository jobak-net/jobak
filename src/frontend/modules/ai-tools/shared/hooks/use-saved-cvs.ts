"use client";

import { useState } from "react";

import { errorMessageOf } from "@/frontend/shared/api";
import { APPLICANT_LIMITS, type SaveCvRequest, type SavedCv } from "@/shared/contracts/applicant";

import { useDeleteCv, useSaveCv } from "../../api/applicant.mutations";

/**
 * The user's saved CVs on an AI tool page: the list from the page's loader,
 * kept in step with what the user does here.
 *
 *  - `remember` saves the CV a tool just ran on (or moves the same one to the
 *    top). In the background: the tool's own request doesn't wait for it, and
 *    a failure is logged, not shown, since the user's work isn't affected.
 *  - `remove` deletes one, at once on the page and on the server; a failure
 *    puts it back and says why.
 */
export function useSavedCvs(initial: SavedCv[]) {
  const [cvs, setCvs] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const save = useSaveCv();
  const removeCv = useDeleteCv();

  function remember(request: SaveCvRequest) {
    save.mutate(request, {
      onSuccess: (saved) =>
        setCvs((list) => [saved, ...list.filter((cv) => cv.id !== saved.id)].slice(0, APPLICANT_LIMITS.savedCvs)),
      // The message only: never the CV.
      onError: (failure) => console.warn(`[ai-tools] couldn't save the CV: ${errorMessageOf(failure)}`),
    });
  }

  function remove(id: string) {
    const before = cvs;
    setError(null);
    setCvs((list) => list.filter((cv) => cv.id !== id));
    removeCv.mutate(id, {
      onError: (failure) => {
        setCvs(before);
        setError(errorMessageOf(failure));
      },
    });
  }

  return { cvs, remember, remove, error };
}
