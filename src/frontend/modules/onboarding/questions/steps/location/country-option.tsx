"use client";

import { memo, type CSSProperties } from "react";
import { Check } from "lucide-react";

import { cn } from "@/frontend/shared/lib";

import { Flag } from "../../../shared/flag";

/** One country tile. Memoised: picking a country re-renders that tile, not all of them. */
export const CountryOption = memo(function CountryOption({
    code,
    name,
    selected,
    onToggle,
    style,
}: {
    code: string;
    name: string;
    selected: boolean;
    onToggle: (code: string) => void;
    style: CSSProperties;
}) {
    return (
        <li className="ob-rise" style={style}>
            <button
                type="button"
                aria-pressed={selected}
                onClick={() => onToggle(code)}
                className={cn(
                    "flex w-full items-center gap-3 rounded-control border px-3 py-2.5 text-left text-sm transition-[background-color,border-color,color,scale] duration-200 active:scale-[0.98]",
                    selected
                        ? "border-accent/55 bg-accent/7 text-fg-primary"
                        : "border-border-subtle text-fg-secondary hover:border-border-strong hover:text-fg-primary",
                )}
            >
                <Flag code={code} className="rounded-[3px]" />
                <span className="min-w-0 flex-1 truncate">{name}</span>
                {selected && <Check className="ob-pop size-4 text-accent" />}
            </button>
        </li>
    );
});
