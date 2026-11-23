"use client";

import { useGenericMutation } from "@/frontend/shared/api";

import { writeCoverLetter } from "./cover-letter.api";

/** Writes one cover letter. Rejects with an `ApiError` whose `message` is what to show. */
export const useWriteCoverLetter = () => useGenericMutation({ mutationFn: writeCoverLetter });
