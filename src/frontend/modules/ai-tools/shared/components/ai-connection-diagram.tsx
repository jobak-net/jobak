import { AiProviderMark, PROVIDER_INFO, PROVIDER_ORDER } from "@/frontend/modules/onboarding";
import { JobakMark } from "@/frontend/shared/ui";

/**
 * The connection that isn't there yet: Jobak on the left, the four AI
 * providers on the right, and between them an empty socket on a dashed line.
 * The lock's picture on the AI tools (`AiToolGate`) — the same Jobak ⟷
 * provider idea onboarding and Settings show once a key is connected.
 */
export function AiConnectionDiagram() {
    const names = PROVIDER_ORDER.map((provider) => PROVIDER_INFO[provider].name).join(", ");

    return (
        <div role="img" aria-label={`Jobak isn't connected to an AI provider yet (${names})`} className="flex items-start">
            <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-card border border-border-standard bg-white/5"
            >
                <JobakMark size={22} />
            </span>

            <span aria-hidden="true" className="relative mt-1 flex flex-1 flex-col items-center">
                <span className="absolute inset-x-0 top-4 border-t border-dashed border-border-strong" />
                <span className="relative z-10 size-8 rounded-full border border-dashed border-border-strong bg-bg-panel" />
                <span className="mt-2 text-[12px] text-fg-tertiary">Not connected</span>
            </span>

            <span aria-hidden="true" className="mt-1 flex shrink-0 items-center -space-x-1.5">
                {PROVIDER_ORDER.map((provider, i) => (
                    <span
                        key={provider}
                        className="relative flex size-8 items-center justify-center rounded-lg border border-border-standard bg-bg-elevated text-fg-tertiary shadow-sm"
                        style={{ zIndex: PROVIDER_ORDER.length - i }}
                    >
                        <AiProviderMark provider={provider} className="size-4" />
                    </span>
                ))}
            </span>
        </div>
    );
}
