import { ArrowRight, CircleAlert } from "lucide-react";

import { scoreColor } from "@/frontend/shared/ui";

import { ResultSection } from "./tool-parts";

interface CategoryScore {
    id: string;
    label: string;
    score: number;
    max: number;
}

/**
 * A rewritten CV's scores against the original's, category by category, on
 * the same scorecard (CV review's improved CV, CV tailoring's tailored CV).
 * A rewrite that scores lower overall, or in any category, is said to be so
 * plainly, with the categories where the original is stronger in red: the
 * scores are never adjusted to hide it. `noun` names the rewrite ("rewrite",
 * "tailored CV").
 */
export function ScoreComparison({
    before,
    beforeTotal,
    after,
    afterTotal,
    noun,
}: {
    before: CategoryScore[];
    beforeTotal: number;
    after: CategoryScore[];
    afterTotal: number;
    noun: string;
}) {
    const original = new Map(before.map((c) => [c.id, c.score]));
    const weaker = after.filter((c) => c.score < (original.get(c.id) ?? 0));
    const worse = afterTotal < beforeTotal;

    return (
        <ResultSection title="Before and after">
            <div className="mb-4 flex items-center gap-3 text-sm">
                <span className="tabular-nums font-semibold" style={{ color: scoreColor(beforeTotal) }}>
                    {beforeTotal}
                </span>
                <ArrowRight className="size-4 text-fg-quaternary" aria-label="to" />
                <span className="tabular-nums font-semibold" style={{ color: scoreColor(afterTotal) }}>
                    {afterTotal}
                </span>
                <span className="text-fg-tertiary">out of 100, re-scored on the same scorecard</span>
            </div>
            {(worse || weaker.length > 0) && (
                <p
                    role="alert"
                    className="mb-4 flex items-start gap-2 rounded-control border border-status-rose/30 bg-status-rose/6 p-3 text-[13px] leading-relaxed text-fg-secondary"
                >
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-status-rose" />
                    <span>
                        {worse
                            ? `The ${noun} scored lower than your original (${afterTotal} against ${beforeTotal}), so it isn't an improvement. `
                            : `The ${noun} is stronger overall, but weaker in places. `}
                        Your original is better in {weaker.map((c) => c.label.toLowerCase()).join(", ") || "places"}:{" "}
                        {worse ? "keep your original CV" : "keep your original wording there"}, and take only the changes you like.
                    </span>
                </p>
            )}
            <table className="w-full text-[13px]">
                <thead>
                    <tr className="text-left text-xs text-fg-quaternary">
                        <th className="pb-2 font-medium">Category</th>
                        <th className="pb-2 text-right font-medium">Before</th>
                        <th className="pb-2 text-right font-medium">After</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                    {after.map((c) => (
                        <tr key={c.id}>
                            <td className="py-1.5 text-fg-secondary">{c.label}</td>
                            <td className="py-1.5 text-right tabular-nums text-fg-tertiary">
                                {original.get(c.id) ?? "?"}/{c.max}
                            </td>
                            <td
                                className={`py-1.5 text-right tabular-nums ${c.score < (original.get(c.id) ?? 0) ? "text-status-rose" : "text-fg-primary"}`}
                            >
                                {c.score}/{c.max}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </ResultSection>
    );
}
