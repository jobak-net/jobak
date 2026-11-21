import { Globe2 } from "lucide-react";

/**
 * Shown in the Work mode group when "anywhere in the world" is chosen: the
 * work mode is fixed to remote then, so offering choices that would be ignored
 * would mislead. Points back to Location instead.
 */
export function WorldwideNotice({ onOpenLocation }: { onOpenLocation: () => void }) {
    return (
        <div className="ob-rise flex items-start gap-3 rounded-card border border-border-subtle bg-white/2 p-4 text-sm text-fg-secondary">
            <Globe2 className="mt-0.5 size-4 shrink-0 text-accent" />
            <p>
                You chose anywhere in the world, so Jobak searches remote jobs only. Pick MENA countries under{" "}
                <button
                    type="button"
                    onClick={onOpenLocation}
                    className="text-fg-primary underline decoration-white/25 underline-offset-2 hover:decoration-accent"
                >
                    Location
                </button>{" "}
                to choose hybrid or on-site as well.
            </p>
        </div>
    );
}
