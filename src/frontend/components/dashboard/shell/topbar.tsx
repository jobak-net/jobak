"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

import { useAuthEnabled } from "@/frontend/providers";
import { cn } from "@/frontend/lib/utils/utils";

import { JobakLogo } from "@/frontend/components/shared/jobak-logo";

interface TopbarProps {
    onMenuClick: () => void;
    /** For the avatar fallback when there is no Clerk account to show. */
    userInitials: string;
}

/**
 * The bar across the top of every dashboard page: search and account.
 *
 * No page title here — each page's own header carries it, and saying it twice
 * one inch apart was redundant.
 *
 * Search goes to Job matches with the query in the URL, so a result list can be
 * shared and survives a reload. The bell is a placeholder until job alerts
 * exist — it opens a panel that says so rather than pretending.
 */
export function Topbar({ onMenuClick, userInitials }: TopbarProps) {
    const router = useRouter();
    const authEnabled = useAuthEnabled();
    const [query, setQuery] = useState("");
    const [alertsOpen, setAlertsOpen] = useState(false);

    function submitSearch(event: React.FormEvent) {
        event.preventDefault();
        const q = query.trim();
        router.push(q ? `/dashboard/matches?q=${encodeURIComponent(q)}` : "/dashboard/matches");
    }

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border-subtle bg-(--bg-canvas)/80 px-4 backdrop-blur-md sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <button
                    type="button"
                    onClick={onMenuClick}
                    aria-label="Open menu"
                    className="rounded-control p-1.5 text-fg-tertiary hover:bg-white/4 hover:text-fg-primary md:hidden"
                >
                    <Menu className="size-5" />
                </button>
                <div className="md:hidden">
                    <JobakLogo size="sm" showText href="/dashboard" />
                </div>

                <form onSubmit={submitSearch} role="search" className="relative hidden w-full max-w-md sm:block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-quaternary" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search jobs, companies, skills"
                        aria-label="Search jobs"
                        className="h-9 w-full rounded-control border border-border-standard bg-white/2.5 pl-9 pr-3 text-sm text-fg-primary placeholder:text-fg-quaternary transition-colors focus:border-accent/45 focus:outline-none"
                    />
                </form>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setAlertsOpen((open) => !open)}
                        aria-label="Notifications"
                        aria-expanded={alertsOpen}
                        className="relative flex size-9 items-center justify-center rounded-control text-fg-tertiary transition-colors hover:bg-white/4 hover:text-fg-primary"
                    >
                        <Bell className="size-[18px]" />
                        <span className="absolute right-2 top-2 size-1.5 rounded-full bg-accent" />
                    </button>
                    {alertsOpen && (
                        <div className="absolute right-0 top-11 w-72 rounded-card border border-border-standard bg-bg-panel p-4 shadow-2xl">
                            <p className="text-sm font-medium text-fg-primary">Job alerts are coming</p>
                            <p className="mt-1 text-[13px] leading-relaxed text-fg-tertiary">
                                You&apos;ll be told here when strong new matches land. Until then, check Job matches.
                            </p>
                        </div>
                    )}
                </div>

                {authEnabled ? (
                    <UserButton />
                ) : (
                    <span
                        title="Sign-in is off on this instance. You are the local owner."
                        className={cn(
                            "flex size-8 items-center justify-center rounded-full bg-accent/15 font-mono text-[11px] font-semibold text-accent-text",
                        )}
                    >
                        {userInitials}
                    </span>
                )}
            </div>
        </header>
    );
}
