import { cn } from "@/frontend/lib/utils/utils";

export interface StatItem {
    label: string;
    value: string | number;
    /** A short qualifier after the label, e.g. "3 strong". */
    note?: string;
    /** Draws the note in the score colour, for a good number. */
    positive?: boolean;
}

/**
 * The headline numbers, as one strip divided by hairlines.
 *
 * Not four cards. Four identical boxes with an icon tile each is the most
 * recognisable dashboard template there is, and the boxes add nothing the
 * dividers do not: the numbers are the content, so they get the space.
 */
export function StatStrip({ items, className }: { items: StatItem[]; className?: string }) {
    return (
        <dl
            className={cn(
                "grid grid-cols-2 border-y border-border-subtle lg:grid-cols-4",
                // Hairlines between cells: vertical on wide screens, a grid on phones.
                "[&>div]:border-border-subtle [&>div:nth-child(odd)]:border-r lg:[&>div]:border-r lg:[&>div:last-child]:border-r-0",
                "[&>div:nth-child(-n+2)]:border-b lg:[&>div:nth-child(-n+2)]:border-b-0",
                className,
            )}
        >
            {items.map((item) => (
                <div key={item.label} className="px-1 py-5 sm:px-5 first:pl-0">
                    <dd className="text-[30px] font-semibold leading-none tracking-[-0.035em] tabular-nums text-fg-primary">
                        {item.value}
                    </dd>
                    <dt className="mt-2 text-[13px] text-fg-tertiary">
                        {item.label}
                        {item.note && (
                            <span className={cn("ml-1.5", item.positive ? "text-score-high" : "text-fg-quaternary")}>
                                {item.note}
                            </span>
                        )}
                    </dt>
                </div>
            ))}
        </dl>
    );
}
