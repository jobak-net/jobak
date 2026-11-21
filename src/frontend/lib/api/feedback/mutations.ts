"use client";

import { useGenericMutation } from "../config";
import { sendFeedback } from "./api";

/** Sends the feedback form. Rejects with an `ApiError` (shared code and message). */
export const useSendFeedback = () => useGenericMutation({ mutationFn: sendFeedback });
