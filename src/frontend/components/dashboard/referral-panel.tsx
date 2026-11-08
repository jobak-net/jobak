"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Mail, MessageCircle, Share2 } from "lucide-react";

import { LinkedInIcon } from "@/frontend/components/shared/brand-icons";
import { Button } from "@/frontend/components/ui";

const SHARE_MESSAGE = "I've been using Jobak to find jobs. It searches the boards for you and scores every match. It's free:";

const STEPS = [
    { title: "Share your link", body: "Send it to anyone looking for work, or post it where they'll see it." },
    { title: "They create an account", body: "Signing up within 30 days of opening your link connects them to you." },
    { title: "See who joined", body: "Everyone who signs up with your link shows up in the list below." },
];

/**
 * The referral page's working parts: the link, ways to send it, and the list
 * of who used it.
 *
 * All real: the link carries the user's code, the share buttons send it, and
 * the list comes from the `referrals` table (019).
 */
export function ReferralPanel({
    link,
    referrals,
}: {
    link: string;
    /** Friends who joined through the link; `null` when the list could not be loaded. */
    referrals: { displayName: string | null; joined: string }[] | null;
}) {
    const [copied, setCopied] = useState(false);
    const [canShare, setCanShare] = useState(false);

    // The Web Share API exists on most phones and few desktops; offer it only where it works.
    useEffect(() => setCanShare(typeof navigator !== "undefined" && "share" in navigator), []);

    async function copy() {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            /* clipboard blocked — the field is selectable, so the user can copy by hand */
        }
    }

    async function nativeShare() {
        try {
            await navigator.share({ title: "Jobak", text: SHARE_MESSAGE, url: link });
        } catch {
            /* cancelled by the user, or unavailable — nothing to do */
        }
    }

    const encodedLink = encodeURIComponent(link);
    const encodedText = encodeURIComponent(`${SHARE_MESSAGE} ${link}`);
    const shareTargets = [
        { label: "WhatsApp", icon: <MessageCircle className="size-4" />, href: `https://wa.me/?text=${encodedText}` },
        { label: "LinkedIn", icon: <LinkedInIcon className="size-4" />, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}` },
        { label: "Email", icon: <Mail className="size-4" />, href: `mailto:?subject=${encodeURIComponent("Try Jobak")}&body=${encodedText}` },
    ];

    return (
        <div className="space-y-10">
            <section className="rounded-card border border-border-subtle bg-(image:--surface-1) p-5 sm:p-6">
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg-primary">Your link</h2>
                <p className="mt-1 text-[13px] text-fg-tertiary">Anyone who signs up with it is counted as your referral.</p>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <label htmlFor="referral-link" className="sr-only">
                        Your referral link
                    </label>
                    <input
                        id="referral-link"
                        readOnly
                        value={link}
                        onFocus={(event) => event.currentTarget.select()}
                        className="h-10 min-w-0 flex-1 rounded-control border border-border-standard bg-white/2.5 px-3 font-mono text-[13px] text-fg-primary focus:border-accent/45 focus:outline-none"
                    />
                    <Button variant="primary" className="h-10" onClick={copy}>
                        {copied ? <Check /> : <Copy />}
                        {copied ? "Copied" : "Copy link"}
                    </Button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {canShare && (
                        <Button variant="secondary" size="sm" onClick={nativeShare}>
                            <Share2 /> Share
                        </Button>
                    )}
                    {shareTargets.map((target) => (
                        <Button key={target.label} variant="secondary" size="sm" asChild>
                            <a href={target.href} target="_blank" rel="noreferrer">
                                {target.icon}
                                {target.label}
                            </a>
                        </Button>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg-primary">How it works</h2>
                <ol className="mt-4 grid gap-6 sm:grid-cols-3">
                    {STEPS.map((step, i) => (
                        <li key={step.title} className="flex gap-3.5">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-xs tabular-nums text-fg-tertiary">
                                {i + 1}
                            </span>
                            <span>
                                <span className="block text-sm font-medium text-fg-primary">{step.title}</span>
                                <span className="mt-1 block text-[13px] leading-relaxed text-fg-tertiary">{step.body}</span>
                            </span>
                        </li>
                    ))}
                </ol>
            </section>

            <section>
                <h2 className="mb-3 text-[15px] font-semibold tracking-[-0.01em] text-fg-primary">Your referrals</h2>

                {referrals === null ? (
                    <p className="text-sm text-fg-tertiary">
                        We couldn&apos;t load your referrals just now. Your link still works; try this page again later.
                    </p>
                ) : referrals.length === 0 ? (
                    <div className="rounded-card border border-dashed border-border-standard px-6 py-10 text-center">
                        <p className="text-sm font-medium text-fg-primary">No one has joined through your link yet</p>
                        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-fg-tertiary">
                            When a friend creates an account with it, they&apos;ll appear here.
                        </p>
                    </div>
                ) : (
                    <>
                        <p className="mb-4 text-sm text-fg-tertiary">
                            <span className="font-semibold tabular-nums text-fg-primary">{referrals.length}</span>{" "}
                            {referrals.length === 1 ? "friend has" : "friends have"} joined through your link.
                        </p>
                        <ul className="divide-y divide-border-subtle overflow-hidden rounded-card border border-border-subtle">
                            {referrals.map((referral, i) => (
                                <li key={i} className="flex items-center gap-3 px-5 py-3.5">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-medium text-fg-secondary">
                                        {(referral.displayName ?? "?").charAt(0)}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm text-fg-primary">
                                        {referral.displayName ?? "A friend"}
                                    </span>
                                    <span className="text-xs text-fg-tertiary">Joined {referral.joined}</span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </section>
        </div>
    );
}
