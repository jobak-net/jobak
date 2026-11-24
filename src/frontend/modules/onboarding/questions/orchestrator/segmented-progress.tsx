import type { StepId } from "@/shared/onboarding/step-rules";
import { cn } from "@/frontend/shared/lib";

/**
 * One segment per step on the current route. Finished steps fill with the
 * accent; the current one is only outlined, because nothing in it is done yet.
 * (The old single bar counted the current step as done, so it showed a fifth
 * filled before anything was answered.)
 */
export function SegmentedProgress({ route, index }: { route: StepId[]; index: number }) {
    return (
        <div
            role="progressbar"
            aria-label="Onboarding progress"
            aria-valuemin={0}
            aria-valuemax={route.length}
            aria-valuenow={index}
            aria-valuetext={`${index} of ${route.length} steps done`}
            className="mt-5 flex gap-1.5"
        >
            {route.map((id, i) => (
                <span
                    key={id}
                    className={cn(
                        "relative h-1 flex-1 overflow-hidden rounded-full transition-colors duration-500",
                        i === index ? "bg-white/18" : "bg-white/7",
                    )}
                >
                    <span
                        className={cn(
                            "absolute inset-0 origin-left rounded-full bg-accent transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                            i < index ? "scale-x-100" : "scale-x-0",
                        )}
                    />
                </span>
            ))}
        </div>
    );
}
