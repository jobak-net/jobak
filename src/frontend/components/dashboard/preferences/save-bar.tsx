import { Check, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/frontend/components/ui";
import { cn } from "@/frontend/lib/utils/utils";
import type { StepId } from "@/shared/onboarding/step-rules";

import { GROUP_LABEL } from "./groups";
import type { FormError } from "./use-preferences-form";

/**
 * The bar that floats over the page while there is something to save, or just
 * was: what's unsaved (or the save's own error), Discard and Save.
 */
export function SaveBar({
    changed,
    dirty,
    justSaved,
    saving,
    error,
    onDiscard,
    onSave,
}: {
    changed: StepId[];
    dirty: boolean;
    justSaved: boolean;
    saving: boolean;
    error: FormError | null;
    onDiscard: () => void;
    onSave: () => void;
}) {
    return (
        <div
            aria-live="polite"
            className={cn(
                "sticky bottom-5 z-20 mx-auto mt-6 flex max-w-3xl items-center gap-3 rounded-card border border-border-standard bg-bg-panel/95 py-2.5 pl-4 pr-2.5 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.8)] transition-[opacity,translate] duration-300",
                dirty || justSaved || saving || error ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
            )}
        >
            <p className="min-w-0 flex-1 truncate text-[13px] text-fg-secondary">
                {saving ? (
                    "Saving…"
                ) : error && error.stepId === null ? (
                    <span role="alert" className="text-status-rose">
                        {error.message}
                    </span>
                ) : dirty ? (
                    `Unsaved changes in ${changed.map((id) => GROUP_LABEL[id]).join(", ")}.`
                ) : (
                    <span className="inline-flex items-center gap-1.5 text-accent-text">
                        <Check className="size-3.5" /> Saved. Your next search uses these.
                    </span>
                )}
            </p>
            {dirty && (
                <Button variant="quiet" onClick={onDiscard} disabled={saving}>
                    <RotateCcw /> Discard
                </Button>
            )}
            <Button variant="primary" onClick={onSave} disabled={!dirty || saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Check />}
                Save preferences
            </Button>
        </div>
    );
}
