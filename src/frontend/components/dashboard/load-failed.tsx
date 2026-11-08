"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RotateCw } from "lucide-react";

import { JobakLogo } from "@/frontend/components/shared/jobak-logo";
import { Button } from "@/frontend/components/ui";

/**
 * Shown when the dashboard could not load the signed-in user — the database
 * timing out, in practice. Not a sign-in page: the user is signed in, and
 * sending them to /login is what used to cause a redirect loop.
 *
 * Retry re-fetches from the server — through the error boundary's `retry` when
 * rendered by one, otherwise by refreshing the route — which is all a transient
 * connection problem needs.
 */
export function LoadFailed({ onRetry }: { onRetry?: () => void }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    function retry() {
        startTransition(() => {
            if (onRetry) onRetry();
            else router.refresh();
        });
    }

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-(--bg-canvas) px-6 text-center">
            <JobakLogo size="sm" showText />
            <h1 className="mt-10 text-[22px] font-semibold tracking-[-0.03em] text-fg-primary">
                We couldn&apos;t load your dashboard
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-fg-tertiary">
                Something on our side didn&apos;t respond in time. You&apos;re still signed in. This is usually
                temporary, so try again in a moment.
            </p>
            <Button variant="primary" className="mt-6" onClick={retry} disabled={pending}>
                <RotateCw className={pending ? "animate-spin" : undefined} />
                {pending ? "Retrying" : "Try again"}
            </Button>
        </div>
    );
}
