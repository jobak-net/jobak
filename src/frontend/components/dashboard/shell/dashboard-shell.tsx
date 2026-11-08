"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { cn } from "@/frontend/lib/utils/utils";

import { Sidebar } from "./sidebar";
import { ReferralClaim } from "../referral-claim";
import { Topbar } from "./topbar";

const COLLAPSED_KEY = "jobak:sidebar-collapsed";

/**
 * Sidebar + top bar + content, for every page under /dashboard.
 *
 * The collapsed state is remembered per browser — a convenience, so it lives in
 * localStorage and every access is guarded: private windows and blocked storage
 * just fall back to expanded.
 */
export function DashboardShell({
    userInitials,
    children,
}: {
    userInitials: string;
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        try {
            setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
        } catch {
            /* storage unavailable — stay expanded */
        }
    }, []);

    // A navigation from the drawer should close it.
    useEffect(() => setMobileOpen(false), [pathname]);

    function updateCollapsed(next: boolean) {
        setCollapsed(next);
        try {
            window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
        } catch {
            /* not persisted — fine */
        }
    }

    return (
        <div className="min-h-dvh bg-(--bg-canvas)">
            <Sidebar
                collapsed={collapsed}
                onCollapsedChange={updateCollapsed}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
            />
            <div
                className={cn(
                    "flex min-h-dvh flex-col transition-[margin] duration-300 ease-out",
                    collapsed ? "md:ml-[72px]" : "md:ml-[260px]",
                )}
            >
                <Topbar onMenuClick={() => setMobileOpen(true)} userInitials={userInitials} />
                <ReferralClaim />
                <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    {/* Keyed on the path so each page gets the entrance animation. */}
                    <div key={pathname} className="dash-enter mx-auto max-w-[1280px]">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
