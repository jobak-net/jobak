"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { queryClientConfig } from "@/frontend/lib/api/config";

/**
 * TanStack Query for the whole app: what the hooks in `lib/api/<resource>/`
 * run on. See `docs/frontend/DATA_FETCHING.md`.
 *
 * One client per browser tab, made once (`useState`), so it survives
 * re-renders but is never shared between requests on the server.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
    // One client per browser tab, with the app's defaults (`lib/api/config.ts`).
    const [client] = useState(() => new QueryClient({ defaultOptions: queryClientConfig }));

    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
