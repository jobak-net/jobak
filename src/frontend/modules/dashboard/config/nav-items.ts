import {
    Bookmark,
    BriefcaseBusiness,
    FileCheck2,
    FileSearch,
    Gift,
    KanbanSquare,
    LayoutDashboard,
    type LucideIcon,
    MessagesSquare,
    PenLine,
    Settings,
    SlidersHorizontal,
    Sparkles,
} from "lucide-react";

/**
 * Every page in the dashboard, grouped as the sidebar shows them.
 *
 * One list drives the sidebar, the mobile drawer and the top bar's title, so a
 * page added here appears in all three at once. `preview` marks pages whose
 * backend is not built yet — they render sample data and say so.
 */

export interface DashboardNavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    preview?: boolean;
}

export interface DashboardNavGroup {
    label: string;
    items: DashboardNavItem[];
}

export const DASHBOARD_NAV: DashboardNavGroup[] = [
    {
        label: "Workspace",
        items: [
            { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
            { href: "/dashboard/matches", label: "Job matches", icon: BriefcaseBusiness },
            { href: "/dashboard/saved", label: "Saved jobs", icon: Bookmark },
            { href: "/dashboard/applications", label: "Applications", icon: KanbanSquare, preview: true },
        ],
    },
    {
        label: "AI tools",
        items: [
            { href: "/dashboard/cv-review", label: "CV review", icon: FileCheck2, preview: true },
            { href: "/dashboard/cv-tailor", label: "Tailor CV to a job", icon: Sparkles, preview: true },
            { href: "/dashboard/cover-letter", label: "Cover letter", icon: PenLine, preview: true },
            { href: "/dashboard/cv-match", label: "Jobs for my CV", icon: FileSearch, preview: true },
            { href: "/dashboard/interview-prep", label: "Interview prep", icon: MessagesSquare, preview: true },
        ],
    },
    {
        label: "Account",
        items: [
            { href: "/dashboard/preferences", label: "Preferences", icon: SlidersHorizontal, preview: true },
            { href: "/dashboard/referrals", label: "Refer a friend", icon: Gift },
            { href: "/dashboard/settings", label: "Settings", icon: Settings, preview: true },
        ],
    },
];

const ALL_ITEMS = DASHBOARD_NAV.flatMap((group) => group.items);

/**
 * The item for a path. Exact match for Overview — every other path starts with
 * `/dashboard` too — and prefix match for the rest, so nested pages keep their
 * parent highlighted.
 */
export function navItemFor(pathname: string): DashboardNavItem | undefined {
    if (pathname === "/dashboard") return ALL_ITEMS[0];
    return ALL_ITEMS.find(
        (item) => item.href !== "/dashboard" && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
    );
}
