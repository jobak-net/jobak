"use client";

import { useCallback, useEffect, useReducer, useState } from "react";

import { useSlideDirection } from "@/frontend/components/dashboard/step-tabs";
import { applyDraftPatch, type DraftPatch } from "@/frontend/components/onboarding/questions/orchestrator/draft";
import { useSavePreferences } from "@/frontend/hooks/api/use-save-preferences";
import { errorMessageOf } from "@/frontend/lib/api/api-error";
import type { JobPreferences } from "@/shared/contracts/preferences";
import type { StepId } from "@/shared/onboarding/step-rules";
import { routeFor, validateForCompletion } from "@/shared/onboarding/steps";
import { applySearchRules, EMPTY_PREFERENCES } from "@/shared/preferences/search-rules";

import { changedGroups, GROUPS } from "./groups";

/** A group's problem (`stepId`), or one with the save itself (`null`). */
export type FormError = { stepId: StepId | null; message: string };

/**
 * Everything the Preferences page does, apart from drawing it: the saved
 * answers and the draft being edited, which group is open, what changed, and
 * saving.
 *
 * Edits go through the same rules as onboarding (`applyDraftPatch`), and the
 * save is checked locally with the same step rules the server runs, so most
 * mistakes are caught without a round trip.
 */
export function usePreferencesForm(initial: JobPreferences | null) {
    const [saved, setSaved] = useState(() => applySearchRules(initial ?? EMPTY_PREFERENCES));
    const [draft, dispatch] = useReducer(applyDraftPatch, saved);
    const [active, setActive] = useState<StepId>("location");
    const [error, setError] = useState<FormError | null>(null);
    const [justSaved, setJustSaved] = useState(false);
    const saveRequest = useSavePreferences();

    const changed = changedGroups(draft, saved);
    const dirty = changed.length > 0;
    const index = GROUPS.indexOf(active);

    // Which way the group changed, so it slides in from that side (as onboarding does).
    const direction = useSlideDirection(active, index);

    // Stable, so the memoised options in the screens skip re-rendering.
    const update = useCallback((patch: DraftPatch) => {
        setError(null);
        setJustSaved(false);
        dispatch(patch);
    }, []);

    // Leaving with unsaved edits asks first.
    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => event.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    function save() {
        const missing = validateForCompletion(draft);
        if (missing) {
            setActive(missing.stepId);
            return setError(missing);
        }

        saveRequest.mutate(draft, {
            onSuccess: (result) => {
                if (!result.ok) {
                    setActive(result.stepId);
                    return setError({ stepId: result.stepId, message: result.message });
                }
                // What was stored, with the catalogue's spelling of each title.
                setSaved(result.preferences);
                dispatch(result.preferences);
                setJustSaved(true);
            },
            // The shared message for whatever went wrong — the same words the backend sent.
            onError: (cause) => setError({ stepId: null, message: errorMessageOf(cause) }),
        });
    }

    function discard() {
        dispatch(saved);
        setError(null);
    }

    return {
        draft,
        active,
        open: setActive,
        index,
        direction,
        previous: GROUPS[index - 1],
        next: GROUPS[index + 1],
        /** False when the open group doesn't apply (work mode, with "anywhere in the world"). */
        onRoute: routeFor(draft).includes(active),
        changed,
        dirty,
        error,
        justSaved,
        saving: saveRequest.isPending,
        update,
        save,
        discard,
    };
}
