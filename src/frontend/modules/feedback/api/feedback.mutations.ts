"use client";

import { useGenericMutation } from "@/frontend/shared/api";

import { sendFeedback } from "./feedback.api";

/** Sends the feedback form. Rejects with an `ApiError` (shared code and message). */
export const useSendFeedback = () => useGenericMutation({ mutationFn: sendFeedback });
