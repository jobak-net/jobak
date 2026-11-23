import { cn } from "@/frontend/shared/lib";
import type { JobRequirement } from "@/shared/contracts/cv-tailor";

const MATCH: Record<JobRequirement["match"], { label: string; className: string }> = {
    strong: { label: "Shown", className: "border-score-high/40 text-score-high" },
    partial: { label: "Partly", className: "border-status-amber/40 text-status-amber" },
    transferable: { label: "Transferable", className: "border-accent/30 text-accent-text" },
    missing: { label: "Missing", className: "border-status-rose/40 text-status-rose" },
};

const TYPE: Record<JobRequirement["type"], string> = {
    essential: "Essential",
    important: "Important",
    preferred: "Preferred",
    contextual: "Implied",
};

/**
 * The posting's requirements, most important first, each with how the CV
 * meets it and the CV's own words that show it (quotes checked on the server).
 */
export function RequirementsList({ requirements }: { requirements: JobRequirement[] }) {
    return (
        <ul className="divide-y divide-border-subtle">
            {requirements.map((requirement, index) => (
                <li key={`${requirement.requirement}-${index}`} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="font-medium text-fg-primary">{requirement.requirement}</span>
                        <span
                            className={cn(
                                "rounded-full border px-2 py-px text-[11px] font-medium",
                                MATCH[requirement.match].className,
                            )}
                        >
                            {MATCH[requirement.match].label}
                        </span>
                        <span className="text-xs text-fg-quaternary">
                            {TYPE[requirement.type]}, {requirement.priority} priority
                        </span>
                    </div>
                    {requirement.evidence && (
                        <blockquote className="mt-1.5 border-l-2 border-score-high/40 pl-3 text-[13px] leading-relaxed text-fg-tertiary">
                            “{requirement.evidence}”
                        </blockquote>
                    )}
                    {requirement.note && <p className="mt-1 text-[13px] leading-relaxed text-fg-tertiary">{requirement.note}</p>}
                </li>
            ))}
        </ul>
    );
}
