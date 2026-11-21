"use client";

import { keepPreviousData } from "@tanstack/react-query";

import { MIN_QUERY_LENGTH } from "@/shared/contracts/job-catalogue";

import { useGenericQuery } from "../config";
import { jobTitleSearchKey, searchJobTitles } from "./api";

/**
 * Type-ahead title search. Pass what the user settled on (debounce it first —
 * `useDebouncedValue`). Nothing is sent while the query is shorter than
 * `MIN_QUERY_LENGTH`. Each query has its own key, so a slow answer to an older
 * one can never overwrite a newer one; the previous results stay on screen
 * while the next ones load. Rejects with an `ApiError`.
 */
export function useJobTitleSearch(query: string, field?: string | null) {
    const q = query.trim();
    return useGenericQuery(jobTitleSearchKey(q, field ?? null), () => searchJobTitles(q, field ?? null), {
        enabled: q.length >= MIN_QUERY_LENGTH,
        placeholderData: keepPreviousData,
        // The catalogue changes rarely; the same query within a few minutes needs no new request.
        staleTime: 5 * 60_000,
    });
}
