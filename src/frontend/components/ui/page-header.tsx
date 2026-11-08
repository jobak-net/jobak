import Link from "next/link";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { cn } from "@/frontend/lib/utils/utils";

interface PageHeaderProps {
    title: string;
    /** One line of orientation. Optional — not every page needs explaining. */
    description?: string;
    /**
     * Marks a page whose feature is not built yet. `true` uses the default
     * wording; a string replaces it. Shown as one quiet line under the title
     * rather than a banner, so twelve preview pages do not shout twelve times.
     */
    preview?: boolean | string;
    /** Where the back arrow goes. Omitted on top-level pages. */
    backHref?: string;
    backLabel?: string;
    /** Right-aligned actions, kept on the title's baseline. */
    actions?: React.ReactNode;
    className?: string;
}

/**
 * One header for every signed-in page.
 *
 * Title and one line, nothing above it. The mono breadcrumb that used to sit
 * over every title repeated what the sidebar already shows, and an uppercase
 * label above every heading is the most templated rhythm a page can have.
 */
export function PageHeader({
    title,
    description,
    preview,
    backHref,
    backLabel = "Dashboard",
    actions,
    className,
}: PageHeaderProps) {
    return (
        <header className={cn("mb-8", className)}>
            {backHref && (
                <Link
                    href={backHref}
                    className="mb-6 inline-flex items-center gap-2 text-[13px] text-fg-tertiary transition-colors hover:text-fg-primary"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {backLabel}
                </Link>
            )}

            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-fg-primary">{title}</h1>
                    {description && (
                        <p className="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-fg-tertiary">{description}</p>
                    )}
                </div>

                {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
            </div>

            {preview && (
                <p className="mt-3 flex items-center gap-2 text-[13px] text-fg-tertiary">
                    <FlaskConical className="size-3.5 shrink-0 text-status-amber" />
                    {typeof preview === "string"
                        ? preview
                        : "Preview. The AI behind this is being built, so results below are sample output."}
                </p>
            )}
        </header>
    );
}
