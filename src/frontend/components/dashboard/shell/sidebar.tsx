"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { JobakLogo, JobakMark } from "@/frontend/components/shared/jobak-logo";
import { cn } from "@/frontend/lib/utils/utils";

import { DASHBOARD_NAV, navItemFor } from "../nav-items";

interface SidebarProps {
    collapsed: boolean;
    onCollapsedChange: (collapsed: boolean) => void;
    mobileOpen: boolean;
    onMobileClose: () => void;
}

/**
 * The dashboard's navigation.
 *
 * Desktop: fixed on the left, collapsible to an icon rail. Mobile: the same
 * panel slides in over the page as a drawer. Real links rather than in-page
 * state, so every page has a URL that can be bookmarked and shared.
 *
 * Preview pages are not flagged here. Nine "Soon" chips down the rail were
 * noise; each page says it is a preview at the top instead.
 */
export function Sidebar({ collapsed, onCollapsedChange, mobileOpen, onMobileClose }: SidebarProps) {
    const pathname = usePathname();
    const active = navItemFor(pathname);

    return (
        <>
            {/* Mobile backdrop */}
            <div
                aria-hidden="true"
                onClick={onMobileClose}
                className={cn(
                    "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden",
                    mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
                )}
            />

            <aside
                className={cn(
                    "fixed left-0 top-0 z-50 flex h-dvh flex-col border-r border-border-subtle bg-bg-panel transition-[width,transform,visibility] duration-300 ease-out",
                    // Mobile: a drawer, off-canvas until opened. `invisible` as
                    // well as translated, so its links leave the tab order and
                    // the accessibility tree while it is shut.
                    "w-[272px] md:visible md:translate-x-0",
                    mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full",
                    collapsed ? "md:w-[72px]" : "md:w-[260px]",
                )}
            >
                <div
                    className={cn(
                        "flex h-16 shrink-0 items-center justify-between border-b border-border-subtle px-4",
                        collapsed && "md:justify-center md:px-0",
                    )}
                >
                    {/* Expanded: the full logo, exactly as the homepage shows it. */}
                    <div className={cn(collapsed && "md:hidden")}>
                        <JobakLogo size="md" showText href="/dashboard" />
                    </div>
                    {/* Collapsed: the same J on its own, centred in the rail. */}
                    {collapsed && (
                        <Link href="/dashboard" className="hidden md:inline-flex" aria-label="Jobak dashboard">
                            <JobakMark size={32} />
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={onMobileClose}
                        aria-label="Close menu"
                        className="rounded-control p-1.5 text-fg-tertiary hover:bg-white/4 hover:text-fg-primary md:hidden"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 py-5">
                    {DASHBOARD_NAV.map((group) => (
                        <div key={group.label}>
                            <p
                                className={cn(
                                    "mb-1.5 px-3 text-xs font-medium text-fg-quaternary transition-opacity",
                                    collapsed && "md:opacity-0",
                                )}
                            >
                                {group.label}
                            </p>
                            <ul className="space-y-0.5">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = active?.href === item.href;

                                    return (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                onClick={onMobileClose}
                                                title={collapsed ? item.label : undefined}
                                                aria-current={isActive ? "page" : undefined}
                                                className={cn(
                                                    "group relative flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors",
                                                    isActive
                                                        ? "bg-white/6 text-fg-primary"
                                                        : "text-fg-tertiary hover:bg-white/3 hover:text-fg-primary",
                                                )}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={cn(
                                                        "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent transition-opacity",
                                                        isActive ? "opacity-100" : "opacity-0",
                                                    )}
                                                />
                                                <Icon
                                                    className={cn(
                                                        "size-[18px] shrink-0 transition-transform",
                                                        isActive ? "text-accent" : "group-hover:scale-110",
                                                    )}
                                                />
                                                <span
                                                    className={cn(
                                                        "flex-1 truncate whitespace-nowrap transition-opacity",
                                                        collapsed && "md:hidden",
                                                    )}
                                                >
                                                    {item.label}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                <div className="hidden shrink-0 border-t border-border-subtle p-3 md:block">
                    <button
                        type="button"
                        onClick={() => onCollapsedChange(!collapsed)}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        className="flex w-full items-center justify-center gap-2 rounded-control px-3 py-2 text-sm text-fg-tertiary transition-colors hover:bg-white/4 hover:text-fg-primary"
                    >
                        {collapsed ? (
                            <ChevronRight className="size-[18px]" />
                        ) : (
                            <>
                                <ChevronLeft className="size-[18px]" />
                                <span>Collapse</span>
                            </>
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
}
