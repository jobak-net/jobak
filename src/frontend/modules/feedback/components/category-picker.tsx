import type { FeedbackCategory } from "@/shared/contracts/feedback";

import { FEEDBACK_CATEGORIES } from "../config/feedback-categories";

/** "What is this about?" — one card per category, as a radio group. */
export function CategoryPicker({
    value,
    onChange,
}: {
    value: FeedbackCategory;
    onChange: (next: FeedbackCategory) => void;
}) {
    return (
        <fieldset>
            <legend className="text-sm font-medium text-foreground mb-3">What is this about?</legend>
            <div className="space-y-2">
                {FEEDBACK_CATEGORIES.map((option) => {
                    const selected = value === option.value;
                    return (
                        <label
                            key={option.value}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                selected
                                    ? "border-accent/40 bg-accent/6"
                                    : "border-border-standard bg-white/2 hover:border-foreground/30"
                            }`}
                        >
                            <input
                                type="radio"
                                name="category"
                                value={option.value}
                                checked={selected}
                                onChange={() => onChange(option.value)}
                                className="sr-only"
                            />
                            <span
                                aria-hidden="true"
                                className={`mt-0.5 w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${
                                    selected ? "border-accent" : "border-border-strong"
                                }`}
                            >
                                {selected && <span className="w-2 h-2 rounded-full bg-accent" />}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-medium text-foreground">{option.label}</span>
                                {option.hint && (
                                    <span className="block text-xs text-muted-foreground mt-0.5">{option.hint}</span>
                                )}
                            </span>
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}
