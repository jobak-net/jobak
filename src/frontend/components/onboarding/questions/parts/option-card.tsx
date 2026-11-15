"use client";

import { memo, type CSSProperties } from "react";

import { cn } from "@/frontend/lib/utils/utils";

type OptionCardProps<V extends string> = {
    value: V;
    selected: boolean;
    /** Stable across renders (with `icon` and `style`), so an unchanged card skips re-rendering. */
    onSelect: (value: V) => void;
    icon: React.ReactNode;
    title: string;
    description: string;
    layout?: "row" | "stack";
    className?: string;
    style?: CSSProperties;
};

/**
 * A large selectable card with a radio in its corner — the location and
 * work-mode choices. `stack` puts the icon above the text, for cards in a grid.
 */
export const OptionCard = memo(function OptionCard<V extends string>({
    value,
    selected,
    onSelect,
    icon,
    title,
    description,
    layout = "row",
    className,
    style,
}: OptionCardProps<V>) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(value)}
            style={style}
            className={cn(
                "group relative flex w-full rounded-card border text-left transition-[background-color,border-color,box-shadow,scale] duration-300 active:scale-[0.985]",
                layout === "row" ? "items-center gap-4 p-4 pr-12" : "flex-col items-start gap-5 p-4 pb-5",
                selected
                    ? "border-accent/55 bg-accent/7 shadow-[0_0_0_1px_oklch(0.82_0.2_145/0.25)_inset,0_18px_40px_-20px_oklch(0.82_0.2_145/0.55)]"
                    : "border-border-standard bg-white/2 hover:border-border-strong hover:bg-white/4",
                className,
            )}
        >
            <span
                className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-control transition-colors duration-300",
                    selected ? "bg-accent/15 text-accent" : "bg-white/5 text-fg-tertiary group-hover:text-fg-secondary",
                )}
            >
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-fg-primary">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-fg-tertiary">{description}</span>
            </span>
            <span
                aria-hidden="true"
                className={cn(
                    "absolute right-3.5 top-3.5 flex size-4.5 items-center justify-center rounded-full border transition-colors duration-300",
                    selected ? "border-accent" : "border-border-strong",
                )}
            >
                {selected && <span className="ob-pop size-2 rounded-full bg-accent" />}
            </span>
        </button>
    );
}) as <V extends string>(props: OptionCardProps<V>) => React.ReactNode;
