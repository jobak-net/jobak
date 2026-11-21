"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { ApiError } from "@/frontend/lib/api/api-error";
import { clientFetch } from "@/frontend/lib/api/client-fetch";
import { JOB_TITLES_API_PATH, MIN_QUERY_LENGTH, type JobTitleMatch } from "@/shared/contracts/job-catalogue";

/**
 * Type-ahead search over the job title catalogue:
 * `GET /api/v1/job-titles?q=…`. Contract: `@/shared/contracts/job-catalogue`.
 *
 * Pass what the user settled on (debounce it first). Nothing is sent while
 * the query is shorter than `MIN_QUERY_LENGTH`. TanStack Query keys each
 * query, so a slow answer to an older one can never overwrite a newer one;
 * the previous results stay on screen while the next ones load. A failure
 * rejects with an `ApiError` (shared code and message).
 */
export function useJobTitleSearch(query: string, field?: string | null) {
    const q = query.trim();

    return useQuery({
        queryKey: [JOB_TITLES_API_PATH, q, field ?? null],
        queryFn: async (): Promise<JobTitleMatch[]> => {
            const params = new URLSearchParams({ q });
            if (field) params.set("field", field);

            const result = await clientFetch<JobTitleMatch[]>(`${JOB_TITLES_API_PATH}?${params}`);
            if (result.kind === "ok") return result.data;
            throw ApiError.from(result);
        },
        enabled: q.length >= MIN_QUERY_LENGTH,
        placeholderData: keepPreviousData,
        // The catalogue changes rarely; the same query within a few minutes needs no new request.
        staleTime: 5 * 60_000,
    });
}
