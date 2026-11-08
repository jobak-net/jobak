"use client";

import { useEffect } from "react";

import { LoadFailed } from "@/frontend/components/dashboard/load-failed";

/**
 * Catches a failure inside any dashboard page — most often the same user lookup
 * the layout makes, failing again when a page calls `requireUser()` itself.
 *
 * Production builds strip server error messages, so this cannot tell one
 * failure from another; the screen is worded for the common, temporary case.
 */
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[dashboard] page failed", error);
  }, [error]);

  // `retry`, not `reset`: it re-fetches the page from the server, which is what
  // a timed-out lookup needs. `reset` would only re-render the failed result.
  return <LoadFailed onRetry={retry} />;
}
