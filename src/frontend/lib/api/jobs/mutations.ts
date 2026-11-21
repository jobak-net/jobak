"use client";

import { useGenericMutation } from "../config";
import { setBookmark } from "./api";

/**
 * Bookmarks a job or removes the bookmark. Rejects with an `ApiError` (shared
 * code and message).
 *
 * Nothing to invalidate: the job lists are loaded on the server
 * (`loaders/jobs.ts`), and each dashboard page fetches them fresh.
 */
export const useSetBookmark = () => useGenericMutation({ mutationFn: setBookmark });
