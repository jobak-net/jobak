"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";

import { JobakLogo } from "@/frontend/components/shared/jobak-logo";
import { Button } from "@/frontend/components/ui";

/**
 * The error boundary for every route without a closer one: the public pages,
 * sign-in and sign-up. The dashboard has its own (`(protected)/dashboard/
 * error.tsx`), worded for a signed-in user; Next always uses the nearest.
 *
 * Renders inside the root layout, so the site's styles and fonts are here, but
 * above the public layout — the navigation that failed may be the thing that
 * broke, so this page brings its own way home instead of relying on it.
 *
 * Failures in the root layout itself never reach this file: a boundary cannot
 * catch the layout it sits inside. `global-error.tsx` covers that case.
 */
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    console.error("[app] page failed", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-(--bg-canvas) px-6 text-center">
      <JobakLogo showText />

      <h1 className="mt-10 text-[24px] font-semibold tracking-[-0.03em] text-fg-primary">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-fg-tertiary">
        This page didn&apos;t load properly. It&apos;s usually temporary, so try again. If it keeps happening,
        let us know.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {/* `retry` re-fetches the page from the server, which is what a transient failure needs. */}
        <Button variant="primary" onClick={() => startTransition(() => retry())} disabled={pending}>
          <RotateCw className={pending ? "animate-spin" : undefined} />
          {pending ? "Retrying" : "Try again"}
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/">Go to homepage</Link>
        </Button>
      </div>

      {/*
        Production strips server error messages and leaves a digest instead. It
        means nothing to a visitor, but quoted to support it finds the exact
        server log line.
      */}
      {error.digest && <p className="mt-8 font-mono text-xs text-fg-tertiary">Reference: {error.digest}</p>}
    </main>
  );
}
