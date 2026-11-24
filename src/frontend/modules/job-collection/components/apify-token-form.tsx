"use client";

import { useId, useState, type FormEvent } from "react";
import { Check, CircleAlert, ExternalLink, Loader2 } from "lucide-react";

import { Button, Field, Input } from "@/frontend/shared/ui";
import { cn } from "@/frontend/shared/lib";

import { useApifyToken } from "../hooks/use-apify-token";
import { ApifyError } from "../lib/apify-client";

const CONSOLE_TOKENS_URL = "https://console.apify.com/settings/integrations";

/** What went wrong saving, in this form's words. */
function saveErrorText(error: unknown): string {
    if (error instanceof ApifyError) {
        if (error.kind === "unauthorized") return "Apify didn't accept this token. Check you copied all of it.";
        if (error.kind === "forbidden") return "This token isn't allowed to read your Apify account. Give it more permissions, or use a token without limits.";
        if (error.kind === "network") return "Apify couldn't be reached. Check your connection and try again.";
        if (error.kind === "rate-limited") return "Apify is asking us to slow down. Try again in a minute.";
        return "Apify couldn't check the token right now. Try again in a minute.";
    }
    return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

/**
 * Paste an Apify token, check it with Apify, keep it in this browser. Used
 * in Settings and right inside the locked page's card: saving it unlocks the
 * page in place (every `useApifyToken` hears the change).
 */
export function ApifyTokenForm({
    accountId,
    label = "Apify token",
    variant = "full",
}: {
    accountId: string;
    label?: string;
    /** "full" lists how to get a token step by step; "compact" (the lock card) keeps it to one line. */
    variant?: "full" | "compact";
}) {
    const id = useId();
    const apify = useApifyToken(accountId);
    const [value, setValue] = useState("");
    const [saved, setSaved] = useState(false);

    async function submit(event: FormEvent) {
        event.preventDefault();
        setSaved(false);
        try {
            await apify.save(value);
            setValue("");
            setSaved(true);
        } catch {
            /* shown from apify.saveError */
        }
    }

    const consoleLink = (
        <a
            href={CONSOLE_TOKENS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent-text underline-offset-2 hover:underline"
        >
            API &amp; Integrations in Apify <ExternalLink className="size-3" />
        </a>
    );

    return (
        <form onSubmit={submit} className="space-y-4">
            {variant === "full" ? (
                <ol className="space-y-2 text-[13px] leading-relaxed text-fg-tertiary">
                    <li>1. Open {consoleLink}.</li>
                    <li>
                        2. Create a token. If you turn on &ldquo;Limit token permissions&rdquo;, it must still be able to read your account,
                        run actors and read their results; otherwise searches fail with &ldquo;not allowed&rdquo;.
                    </li>
                    <li>3. Paste it here.</li>
                </ol>
            ) : (
                <p className="text-[13px] leading-relaxed text-fg-tertiary">Copy a token from {consoleLink} and paste it here.</p>
            )}
            <Field label={label} htmlFor={`${id}-token`}>
                <Input
                    id={`${id}-token`}
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="apify_api_…"
                    value={value}
                    onChange={(event) => {
                        setValue(event.target.value);
                        setSaved(false);
                    }}
                />
            </Field>
            <div className={cn("flex flex-wrap items-center gap-3", variant === "compact" && "flex-col items-stretch")}>
                <Button variant="primary" type="submit" disabled={!value.trim() || apify.saving} className={cn(variant === "compact" && "w-full")}>
                    {apify.saving ? <Loader2 className="animate-spin" /> : <Check />}
                    {variant === "compact" ? "Check and unlock" : "Check and save"}
                </Button>
                <p aria-live="polite" className="min-w-0 flex-1 text-[13px]">
                    {apify.saveError ? (
                        <span role="alert" className="inline-flex items-start gap-1.5 text-status-amber">
                            <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> {saveErrorText(apify.saveError)}
                        </span>
                    ) : saved ? (
                        <span className="inline-flex items-center gap-1.5 text-accent-text">
                            <Check className="size-3.5" /> Saved in this browser.
                        </span>
                    ) : null}
                </p>
            </div>
        </form>
    );
}
