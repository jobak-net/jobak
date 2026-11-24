"use client";

import { Check, CircleAlert, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/frontend/shared/ui";

import { STORAGE_BLOCKED_MESSAGE, useApifyToken } from "../hooks/use-apify-token";
import { ApifyError } from "../lib/apify-client";
import { ApifyTokenForm } from "./apify-token-form";

/**
 * The Apify token, kept in this browser only: add it (checked with Apify
 * first), see whose account it is, or remove it. Nothing here talks to
 * Jobak's server.
 */
export function ApifyTokenPanel({ accountId }: { accountId: string }) {
    const apify = useApifyToken(accountId);

    const accountErrorKind = apify.accountError instanceof ApifyError ? apify.accountError.kind : null;
    const tokenRejected = accountErrorKind === "unauthorized";
    const tokenLimited = accountErrorKind === "forbidden";

    return (
        <div className="space-y-8">
            <div className="space-y-2 text-[13px] leading-relaxed text-fg-tertiary">
                <p>
                    Find jobs elsewhere runs Apify actors on your own Apify account, to collect jobs from LinkedIn, Wuzzuf, Bayt and
                    36 other sites. Every run spends your Apify credit, and you see the cost before you start.
                </p>
                <p className="text-fg-secondary">
                    Your token stays in this browser. It never reaches Jobak&apos;s server, so you&apos;ll add it again on another device.
                </p>
            </div>

            {apify.status === "saved" && (
                <div className="flex flex-wrap items-center gap-3 rounded-card border border-accent/35 bg-accent/6 p-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                        {apify.account ? <Check className="size-4" /> : <Loader2 className="size-4 animate-spin" />}
                    </span>
                    <p className="min-w-0 flex-1 text-sm">
                        {apify.account ? (
                            <>
                                <span className="block font-medium text-fg-primary">Connected as {apify.account.username}</span>
                                <span className="text-[13px] text-fg-tertiary">{apify.account.plan.toLowerCase()} plan</span>
                            </>
                        ) : tokenRejected ? (
                            <span className="text-status-amber">Apify no longer accepts this token. Add a new one below.</span>
                        ) : tokenLimited ? (
                            <span className="text-status-amber">This token isn&apos;t allowed to read your Apify account. Add one with more permissions below.</span>
                        ) : (
                            <span className="text-fg-tertiary">Checking your token with Apify…</span>
                        )}
                    </p>
                    <Button variant="quiet" size="sm" type="button" onClick={apify.remove}>
                        <Trash2 /> Remove
                    </Button>
                </div>
            )}

            {apify.status === "blocked" ? (
                <p role="alert" className="flex items-start gap-2 rounded-card border border-status-amber/30 bg-status-amber/6 p-4 text-[13px] text-fg-secondary">
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-status-amber" />
                    {STORAGE_BLOCKED_MESSAGE} Allow site data for Jobak, or use a normal (not private) window.
                </p>
            ) : (
                <ApifyTokenForm accountId={accountId} label={apify.status === "saved" ? "Replace your token" : "Apify token"} />
            )}
        </div>
    );
}
