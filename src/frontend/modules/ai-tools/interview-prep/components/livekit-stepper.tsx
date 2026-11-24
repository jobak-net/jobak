import { Fragment } from "react";
import { Check, ChevronRight } from "lucide-react";

import { cn } from "@/frontend/shared/lib";

/**
 * The setup wizard's progress: one bar segment per step, filled up to the
 * current one, each a button (any step can be opened; what's done in
 * LiveKit can't be checked from here). Steps before the current one show a
 * check.
 */
export function LiveKitStepper({
    steps,
    current,
    onSelect,
}: {
    steps: readonly { id: string; label: string }[];
    current: number;
    onSelect: (index: number) => void;
}) {
    return (
        <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
            {steps.map((step, i) => (
                <li key={step.id}>
                    <button
                        type="button"
                        onClick={() => onSelect(i)}
                        aria-current={i === current ? "step" : undefined}
                        className="group w-full rounded-control text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-4 focus-visible:ring-offset-bg-panel"
                    >
                        <span
                            aria-hidden="true"
                            className={cn(
                                "block h-1 rounded-full transition-colors duration-300 motion-reduce:transition-none",
                                i <= current ? "bg-accent" : "bg-border-standard group-hover:bg-fg-quaternary",
                            )}
                        />
                        <span
                            className={cn(
                                "mt-2.5 flex items-center gap-1.5 text-[12px] font-medium",
                                i === current ? "text-fg-primary" : "text-fg-tertiary group-hover:text-fg-secondary",
                            )}
                        >
                            {i < current ? (
                                <Check aria-hidden="true" className="size-3.5 text-accent-text" />
                            ) : (
                                <span aria-hidden="true" className="tabular-nums">
                                    {i + 1}
                                </span>
                            )}
                            {/* Too narrow on phones: the bar shows numbers, and the step's own heading names it. */}
                            <span className="truncate max-sm:sr-only">{step.label}</span>
                            <span className="sr-only">{i < current ? " (seen)" : ""}</span>
                        </span>
                    </button>
                </li>
            ))}
        </ol>
    );
}

/** Where to click in LiveKit, on its own line, as chips matching its menus: Go to Settings › General › Options. */
export function MenuPath({ items, className }: { items: string[]; className?: string }) {
    return (
        <p className={cn("mb-2 flex flex-wrap items-center gap-1", className)}>
            <span className="mr-0.5">Go to</span>
            {items.map((item, i) => (
                <Fragment key={item}>
                    {i > 0 && (
                        <>
                            <ChevronRight aria-hidden="true" className="size-3 text-fg-quaternary" />
                            <span className="sr-only"> › </span>
                        </>
                    )}
                    <span className="rounded-md border border-border-subtle bg-white/3 px-1.5 py-px text-[12px] font-medium text-fg-secondary">
                        {item}
                    </span>
                </Fragment>
            ))}
        </p>
    );
}
