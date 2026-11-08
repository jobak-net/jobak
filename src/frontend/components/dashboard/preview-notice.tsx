import { FlaskConical } from "lucide-react";

import { cn } from "@/frontend/lib/utils/utils";

/**
 * Says, in one quiet line, that what is shown is sample data.
 *
 * Used where a page has real data most of the time and sample data only until
 * the user sets things up (Overview, Matches). Pages that are previews outright
 * say so through `PageHeader`'s `preview` prop instead.
 */
export function PreviewNotice({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <p role="note" className={cn("flex items-start gap-2 text-[13px] leading-relaxed text-fg-tertiary", className)}>
            <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-status-amber" />
            <span>{children}</span>
        </p>
    );
}
