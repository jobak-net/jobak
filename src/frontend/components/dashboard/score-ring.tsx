import { cn } from "@/frontend/lib/utils/utils";

/**
 * A 0–100 score as a ring.
 *
 * Coloured by the score ramp, never the brand accent — see `--score-*` in
 * globals.css. `null` is a job nobody has scored yet, drawn as an empty ring
 * with a dash rather than a zero that would read as a terrible match.
 */
export function scoreColor(score: number | null): string {
    if (score === null) return "var(--score-low)";
    if (score >= 80) return "var(--score-high)";
    if (score >= 60) return "var(--score-mid)";
    return "var(--score-low)";
}

export function ScoreRing({
    score,
    size = 44,
    stroke = 3.5,
    label,
    className,
}: {
    score: number | null;
    size?: number;
    stroke?: number;
    /** Overrides the number in the middle, e.g. "ATS". */
    label?: string;
    className?: string;
}) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const value = score ?? 0;
    const color = scoreColor(score);

    return (
        <div
            className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
            style={{ width: size, height: size }}
            role="img"
            aria-label={score === null ? "Not scored yet" : `Score ${score} out of 100`}
        >
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--score-pending)" strokeWidth={stroke} />
                {score !== null && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - value / 100)}
                        className="transition-[stroke-dashoffset] duration-700 ease-out"
                    />
                )}
            </svg>
            <span
                className="absolute font-semibold tabular-nums"
                style={{ color: score === null ? "var(--fg-quaternary)" : color, fontSize: size * 0.3 }}
            >
                {label ?? (score === null ? "–" : score)}
            </span>
        </div>
    );
}
