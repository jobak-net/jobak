"use client";

import { useState } from "react";

import { useConnectAiKey, checkKeyFormat, type AiProvider, type ConnectionStatus } from "@/frontend/modules/onboarding";
import { errorMessageOf } from "@/frontend/shared/api";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";

import { useRemoveAiKey, useSetAiModel, useSetPreferredAiProvider } from "../api/ai-settings.mutations";
import type { ModelChoice } from "../lib/model-options";

/**
 * The AI tab's state.
 *
 * **The form** — which provider is open, the model picked for it and the key
 * typed for it — is saved all at once by `save()`, in one request:
 *
 *   key typed                    → `PUT /ai-settings/key` { provider, key, model }
 *                                  (checked with the provider; model saved in the same write)
 *   only the model changed       → `PUT /ai-settings` { provider, model }
 *   (the provider must have a saved key for that)
 *
 * Picking a model only changes the form, kept per provider until saved, so
 * looking at another provider and coming back doesn't lose it.
 *
 * **The saved keys** — switch and remove — act at once, after the row's own
 * confirmation.
 *
 * Everything shown as saved comes from the server's answer, never guessed.
 * A stored key never comes back, so the key field is always empty: typing in
 * it is replacing the key, and the old one keeps working until a new one passes.
 */
export function useAiConnection(initial: AiSettingsResponse | null) {
    const [saved, setSaved] = useState<AiSettingsResponse | null>(initial);
    const [provider, setProvider] = useState<AiProvider>(initial?.preferred ?? "groq");
    /** Kept per provider, so switching to compare and back doesn't lose a paste. */
    const [keys, setKeys] = useState<Partial<Record<AiProvider, string>>>({});
    /** Unsaved model picks: an id, null for "the default", absent for "unchanged". */
    const [modelDrafts, setModelDrafts] = useState<Partial<Record<AiProvider, string | null>>>({});
    const [keyError, setKeyError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedFor, setSavedFor] = useState<AiProvider | null>(null);
    /** A failed switch or remove, shown on the saved keys. */
    const [savedKeysError, setSavedKeysError] = useState<string | null>(null);

    const connectKey = useConnectAiKey();
    const saveModel = useSetAiModel();
    const removeKey = useRemoveAiKey();
    const setPreferredProvider = useSetPreferredAiProvider();

    const connected = saved?.connected ?? [];
    const preferred = saved?.preferred ?? null;
    const key = keys[provider] ?? "";
    const hasKey = key.trim() !== "";
    const isConnected = connected.includes(provider);

    // ── The model field ──
    const savedModel = saved?.models[provider] ?? null;
    const defaultModel = saved?.defaults[provider] ?? null;
    const draft = modelDrafts[provider];
    const model = (draft !== undefined ? draft : savedModel) ?? defaultModel;
    const modelChanged = draft !== undefined && draft !== savedModel;

    // ── Saving ──
    const checking = connectKey.isPending;
    const saving = checking || saveModel.isPending;
    const canSave = !saving && (hasKey ? checkKeyFormat(provider, key).ok : isConnected && modelChanged);
    const saveLabel = saving
        ? checking
            ? "Checking key"
            : "Saving"
        : hasKey
          ? isConnected
              ? "Verify and save"
              : "Verify and connect"
          : "Save changes";
    /** Why Save is disabled, when it isn't obvious. */
    const saveHint =
        saving || canSave || hasKey
            ? null
            : isConnected
              ? "Pick another model or paste a new key to save."
              : "Add the key to connect this provider. The model is saved with it.";

    const savedKeysBusy = removeKey.isPending || setPreferredProvider.isPending;

    const status: ConnectionStatus = checking ? "checking" : isConnected ? "connected" : keyError ? "failed" : "chosen";

    function clearMessages() {
        setKeyError(null);
        setSaveError(null);
        setSavedFor(null);
    }

    function selectProvider(next: AiProvider) {
        setProvider(next);
        clearMessages();
    }

    function setKey(value: string) {
        setKeys((all) => ({ ...all, [provider]: value }));
        clearMessages();
    }

    function pickModel(choice: ModelChoice) {
        // The default is stored as "no pick", so a later change of default reaches this user too.
        const next = choice.isDefault ? null : choice.id;
        setModelDrafts((all) => {
            const copy = { ...all };
            if (next === savedModel) delete copy[provider];
            else copy[provider] = next;
            return copy;
        });
        clearMessages();
    }

    /** After a save: show what the server now holds, and forget what was sent. */
    function settle(sentFor: AiProvider, settings: AiSettingsResponse) {
        setSaved(settings);
        setKeys((all) => ({ ...all, [sentFor]: "" }));
        setModelDrafts((all) => {
            const copy = { ...all };
            delete copy[sentFor];
            return copy;
        });
        setSavedFor(sentFor);
    }

    /** The tab's one Save: the key and the model together (see the top of this file). */
    function save() {
        if (!canSave) return;
        clearMessages();
        const sentFor = provider;

        if (hasKey) {
            connectKey.mutate(
                { provider: sentFor, key, ...(draft !== undefined && { model: draft }) },
                {
                    onSuccess: (settings) => settle(sentFor, settings),
                    onError: (failure) => setKeyError(errorMessageOf(failure)),
                },
            );
            return;
        }
        saveModel.mutate(
            { provider: sentFor, model: draft ?? null },
            {
                onSuccess: (settings) => settle(sentFor, settings),
                onError: (failure) => setSaveError(errorMessageOf(failure)),
            },
        );
    }

    /** Makes a saved key the one the AI tools use. */
    function prefer(next: AiProvider) {
        if (savedKeysBusy || next === preferred) return;
        setSavedKeysError(null);
        setPreferredProvider.mutate(next, {
            onSuccess: setSaved,
            onError: (failure) => setSavedKeysError(errorMessageOf(failure)),
        });
    }

    /** Forgets a saved key. The caller has shown what that changes (`removeKeyImpact`). */
    function remove(target: AiProvider, onDone?: () => void) {
        if (savedKeysBusy) return;
        setSavedKeysError(null);
        removeKey.mutate(target, {
            onSuccess: (settings) => {
                setSaved(settings);
                onDone?.();
            },
            onError: (failure) => setSavedKeysError(errorMessageOf(failure)),
        });
    }

    return {
        provider,
        selectProvider,
        isConnected,
        connected,
        preferred,
        status,

        key,
        setKey,
        keyError,

        /** Null when the settings couldn't be read: the model field is then not shown. */
        model,
        defaultModel,
        modelChanged,
        pickModel,

        save,
        canSave,
        saving,
        checking,
        saveLabel,
        saveHint,
        saveError,
        /** The provider whose save just went through, for the "Saved" note. */
        savedFor,

        prefer,
        remove,
        savedKeysBusy,
        /** Which provider a switch or remove is running for, to show the spinner on its row. */
        savedKeysPendingFor: removeKey.isPending
            ? removeKey.variables
            : setPreferredProvider.isPending
              ? setPreferredProvider.variables
              : null,
        savedKeysError,
    };
}
