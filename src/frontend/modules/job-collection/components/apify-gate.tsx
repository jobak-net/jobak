"use client";

import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";

import { LockedFeature } from "@/frontend/shared/components";

import { STORAGE_BLOCKED_MESSAGE, useApifyToken } from "../hooks/use-apify-token";
import { ApifyTokenForm } from "./apify-token-form";
import { CatalogueOverview } from "./catalogue-overview";

/**
 * Locks Find jobs elsewhere until this browser has an Apify token, and lets
 * the user add it right in the lock's card: once it's checked and saved, the
 * page unlocks in place, no trip to Settings.
 *
 * The token lives in the browser, so this decides on the client: a neutral
 * skeleton until the browser has been read, so a user with a token never sees
 * the lock flash.
 */
export function ApifyGate({ accountId, children }: { accountId: string; children: (token: string) => ReactNode }) {
    const apify = useApifyToken(accountId);

    if (apify.status === "loading") {
        return <div aria-busy="true" aria-label="Loading" className="h-120 animate-pulse rounded-3xl border border-border-subtle bg-white/2" />;
    }
    if (apify.status === "saved" && apify.token) return <>{children(apify.token)}</>;

    return (
        <LockedFeature
            locked
            feature="job collection"
            requirement="your Apify token"
            description="Searches run on your own Apify account, straight from this browser. Jobak never sees your token or the jobs you find."
            action={{
                content:
                    apify.status === "blocked" ? (
                        <p role="alert" className="flex items-start gap-2 rounded-card border border-status-amber/30 bg-status-amber/6 p-4 text-[13px] text-fg-secondary">
                            <CircleAlert className="mt-0.5 size-4 shrink-0 text-status-amber" />
                            {STORAGE_BLOCKED_MESSAGE} Allow site data for Jobak, or use a normal (not private) window.
                        </p>
                    ) : (
                        <ApifyTokenForm accountId={accountId} variant="compact" />
                    ),
            }}
            note="Kept in this browser only. Free Apify accounts get $5 of credit a month. You can remove it in Settings."
        >
            <CatalogueOverview />
        </LockedFeature>
    );
}
