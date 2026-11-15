"use client";

import { useCallback } from "react";
import { ArrowLeftRight, Building2, Laptop } from "lucide-react";

import { WORK_MODE_LABEL } from "@/frontend/components/onboarding/labels";
import type { WorkMode } from "@/shared/contracts/preferences";
import { workModeRules } from "@/shared/onboarding/rules/work-mode";
import { WORK_MODES } from "@/shared/preferences/search-rules";

import type { StepScreenProps, StepStrategy } from "./step-strategy";
import { OptionCard } from "../parts/option-card";
import { riseStyle } from "../parts/rise-style";
import { toggle } from "../parts/toggle";

const WORK_MODE_COPY: Record<WorkMode, { description: string; icon: React.ReactNode }> = {
    remote: { description: "Work from home or anywhere in your country.", icon: <Laptop className="size-5" /> },
    hybrid: { description: "Some days in the office, some at home.", icon: <ArrowLeftRight className="size-5" /> },
    "on-site": { description: "At the employer's office every day.", icon: <Building2 className="size-5" /> },
};

function WorkModeScreen({ draft, update }: StepScreenProps) {
    const toggleMode = useCallback(
        (mode: WorkMode) => update((d) => ({ workModes: toggle(d.workModes, mode) })),
        [update],
    );

    return (
        <div className="grid gap-3 sm:grid-cols-3">
            {WORK_MODES.map((mode, i) => (
                <OptionCard
                    key={mode}
                    className="ob-rise"
                    style={riseStyle(i)}
                    layout="stack"
                    value={mode}
                    selected={draft.workModes.includes(mode)}
                    onSelect={toggleMode}
                    icon={WORK_MODE_COPY[mode].icon}
                    title={WORK_MODE_LABEL[mode]}
                    description={WORK_MODE_COPY[mode].description}
                />
            ))}
        </div>
    );
}

/** Remote, hybrid, on-site. Not asked for "anywhere in the world" (see its `appliesTo`). */
export const workModeStep: StepStrategy = { ...workModeRules, Screen: WorkModeScreen };
