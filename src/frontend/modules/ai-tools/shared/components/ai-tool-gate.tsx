import type { ReactNode } from "react";

import { LockedFeature } from "@/frontend/shared/components";
import { SETTINGS_HREF } from "@/shared/routes";

import { AiConnectionDiagram } from "./ai-connection-diagram";

/** How a key is added, in the order Settings asks for it. */
const STEPS = [
    { title: "Pick a provider", hint: "Groq and Gemini have free tiers." },
    { title: "Paste its key", hint: "We check it with the provider before saving." },
];

/**
 * Locks an AI tool until the user has saved an AI key: the shared
 * `LockedFeature`, with the AI tools' picture (`AiConnectionDiagram`), steps,
 * wording and the way to Settings.
 *
 * `unlocked` comes from `loadAiAccess()` (`@/frontend/modules/ai-tools/server`),
 * so the page decides on the server.
 */
export function AiToolGate({
    feature,
    unlocked,
    children,
}: {
    /** The tool's name as it reads mid-sentence ("To unlock …, add your AI key"): "CV review", "cover letters". */
    feature: string;
    unlocked: boolean;
    children: ReactNode;
}) {
    return (
        <LockedFeature
            locked={!unlocked}
            feature={feature}
            requirement="your AI key"
            visual={<AiConnectionDiagram />}
            description="Jobak's AI tools run on your own key, so what you upload goes straight to the provider you pick."
            steps={STEPS}
            action={{ label: "Add your AI key", href: SETTINGS_HREF }}
            note="Opens Settings. Takes about a minute."
        >
            {children}
        </LockedFeature>
    );
}
