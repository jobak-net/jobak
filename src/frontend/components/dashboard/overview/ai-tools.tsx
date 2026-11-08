import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { DASHBOARD_NAV } from "../nav-items";

const BLURBS: Record<string, string> = {
    "/dashboard/cv-review": "Score it and see what to fix",
    "/dashboard/cv-tailor": "Rewrite it for one job",
    "/dashboard/cover-letter": "A first draft for the role",
    "/dashboard/cv-match": "Jobs that fit what you've done",
    "/dashboard/interview-prep": "Questions you're likely to get",
};

/** The AI tools as a plain list. Driven by the nav config so the two never drift. */
export function AiTools() {
    const tools = DASHBOARD_NAV.find((group) => group.label === "AI tools")?.items ?? [];

    return (
        <ul className="-mx-2 divide-y divide-border-subtle">
            {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                    <li key={tool.href}>
                        <Link
                            href={tool.href}
                            className="group flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-white/2.5"
                        >
                            <Icon className="size-4 shrink-0 text-fg-tertiary transition-colors group-hover:text-accent" />
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm text-fg-primary">{tool.label}</span>
                                <span className="block truncate text-xs text-fg-tertiary">{BLURBS[tool.href]}</span>
                            </span>
                            <ChevronRight className="size-4 shrink-0 text-fg-quaternary transition-transform group-hover:translate-x-0.5 group-hover:text-fg-primary" />
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
