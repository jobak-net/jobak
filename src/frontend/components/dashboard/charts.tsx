import { cn } from "@/frontend/lib/utils/utils";

/**
 * The dashboard's two charts, drawn with plain elements.
 *
 * No charting library: both are bar charts with a handful of data points, and
 * a dependency the size of recharts for that would cost more than it gives.
 * Each bar carries a `title`, so the exact values are one hover away.
 */

/** Daily new matches, with the strong (80+) share stacked on top. */
export function ActivityChart({
    data,
    className,
}: {
    data: { day: string; matches: number; strong: number }[];
    className?: string;
}) {
    const max = Math.max(...data.map((d) => d.matches), 1);

    return (
        <div className={cn("flex h-52 items-end gap-1.5 sm:gap-2", className)}>
            {data.map((point, i) => {
                const total = (point.matches / max) * 100;
                const strongShare = point.matches ? (point.strong / point.matches) * 100 : 0;

                return (
                    <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                        <div
                            title={`${point.matches} matches · ${point.strong} strong`}
                            className="dash-enter relative flex w-full max-w-7 flex-col justify-end overflow-hidden rounded-t-[5px] bg-white/7 transition-colors group-hover:bg-white/12"
                            style={{ height: `${total}%`, "--dash-delay": `${i * 30}ms` } as React.CSSProperties}
                        >
                            <div className="w-full bg-score-high/80" style={{ height: `${strongShare}%` }} />
                        </div>
                        <span className="font-mono text-[9.5px] text-fg-quaternary">{point.day.charAt(0)}</span>
                    </div>
                );
            })}
        </div>
    );
}

/** Horizontal bars, one per stage, sized against the largest. */
export function StageBars({
    stages,
}: {
    stages: { label: string; count: number; color: string }[];
}) {
    const max = Math.max(...stages.map((s) => s.count), 1);

    return (
        <ul className="space-y-4">
            {stages.map((stage, i) => (
                <li key={stage.label}>
                    <div className="mb-1.5 flex items-center justify-between text-[13px]">
                        <span className="flex items-center gap-2 text-fg-secondary">
                            <i aria-hidden="true" className="size-2 rounded-full" style={{ background: stage.color }} />
                            {stage.label}
                        </span>
                        <span className="tabular-nums text-fg-primary">{stage.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                        <div
                            className="dash-enter h-full rounded-full"
                            style={
                                {
                                    width: `${(stage.count / max) * 100}%`,
                                    background: stage.color,
                                    "--dash-delay": `${i * 80}ms`,
                                } as React.CSSProperties
                            }
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}
