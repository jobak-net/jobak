"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * TanStack Query for the whole app: what client components use to call the
 * backend (`useQuery` / `useMutation` with `clientFetch`). See
 * `docs/frontend/DATA_FETCHING.md`.
 *
 * One client per browser tab, made once (`useState`), so it survives
 * re-renders but is never shared between requests on the server.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [client] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    // Answers are per-user and change when the user acts; a short
                    // window just avoids refetching what was read a moment ago.
                    queries: { staleTime: 30_000, retry: 1 },
                    // A save is never retried behind the user's back.
                    mutations: { retry: false },
                },
            }),
    );

    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
