import {
    useMutation,
    useQuery,
    useQueryClient,
    type DefaultOptions,
    type QueryKey,
    type UseQueryOptions,
} from "@tanstack/react-query";

import { ApiError } from "./api-error";
import type { FetchResult } from "./fetch-result";

/**
 * TanStack Query, configured once for the whole app: defaults, retry, and the
 * generic query / mutation hooks every module's API is built on.
 *
 * Each module owns its endpoints, in `modules/<name>/api/`:
 *
 *     <name>.api.ts        plain async functions that call the backend
 *     <name>.queries.ts    useQuery hooks built on them
 *     <name>.mutations.ts  useMutation hooks built on them
 *
 * Components use those hooks, never call `clientFetch` themselves.
 */

/**
 * Don't retry what won't fix itself: a 4xx (signed out, refused, not found)
 * answers the same way the second time. Server and network failures get two
 * more tries.
 */
export function smartRetry(failureCount: number, error: unknown): boolean {
    if (error instanceof ApiError && error.status !== null && error.status >= 400 && error.status < 500) return false;
    return failureCount < 2;
}

/** The defaults `QueryProvider` gives every query and mutation. */
export const queryClientConfig: DefaultOptions = {
    queries: {
        // Answers are per-user and change when the user acts; a short window
        // just avoids refetching what was read a moment ago.
        staleTime: 30_000,
        retry: smartRetry,
    },
    // A save is never retried behind the user's back.
    mutations: { retry: false },
};

/**
 * A backend answer as data, or a thrown `ApiError` (shared code and message).
 * What every `api.ts` function returns through.
 */
export function unwrap<T>(result: FetchResult<T>): T {
    if (result.kind === "ok") return result.data;
    throw ApiError.from(result);
}

/** `useQuery` with this app's retry rule. */
export function useGenericQuery<TData>(
    queryKey: QueryKey,
    queryFn: () => Promise<TData>,
    options?: Omit<UseQueryOptions<TData, Error, TData, QueryKey>, "queryKey" | "queryFn">,
) {
    return useQuery({ queryKey, queryFn, retry: smartRetry, ...options });
}

/**
 * `useMutation` that refreshes what the change made stale: every query key in
 * `invalidateKeys` is invalidated after a success. Callers' own `onSuccess` /
 * `onError` (on `mutate`) still run.
 */
export function useGenericMutation<TVariables, TData>({
    mutationFn,
    invalidateKeys = [],
}: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    invalidateKeys?: QueryKey[];
}) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: () =>
            Promise.all(invalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))).then(() => undefined),
    });
}
