"use client";

import { useEffect } from "react";

import { LoadFailed } from "@/frontend/shared/components";

/**
 * Catches a failure inside any dashboard page — most often a backend call a
 * page's loader makes (`GET /api/v1/me`, `/preferences`, `/referrals`) that
 * failed rather than answered.
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
