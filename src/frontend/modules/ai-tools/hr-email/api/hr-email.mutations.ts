"use client";

import { useGenericMutation } from "@/frontend/shared/api";

import { writeHrEmail } from "./hr-email.api";

/** Writes one email. Rejects with an `ApiError` whose `message` is what to show. */
export const useWriteHrEmail = () => useGenericMutation({ mutationFn: writeHrEmail });
