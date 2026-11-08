"use client";

import { useState } from "react";
import { Check, KeyRound, ShieldCheck } from "lucide-react";

import { Button, Card, Field, FilterChip, Input, Section } from "@/frontend/components/ui";
import { AI_PROVIDERS, keyRules } from "@/frontend/lib/configs/provider-keys";
import { useAuthEnabled } from "@/frontend/providers";
import type { AiProvider } from "@/frontend/types/on-boarding";

const PROVIDER_LABEL: Record<AiProvider, string> = {
    groq: "Groq",
    openai: "OpenAI",
    anthropic: "Claude",
    gemini: "Gemini",
};

const NOTIFICATIONS = [
    { id: "strong", label: "New strong matches", hint: "When a job scores 80 or more for you." },
    { id: "digest", label: "Weekly digest", hint: "A Monday summary of the week's best matches." },
    { id: "status", label: "Application reminders", hint: "Nudges to follow up on applications that have gone quiet." },
] as const;

function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            onClick={() => onChange(!on)}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-white/12"}`}
        >
            <span className={`absolute left-0 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-4.5" : "translate-x-0.5"}`} />
        </button>
    );
}

/**
 * Settings: AI key, notifications, account.
 *
 * The key format check is real — it uses the same `keyRules` the server will —
 * so a typo is caught now. Storing the key is not built yet.
 */
export function SettingsPanels({ email, fullName }: { email: string | null; fullName: string | null }) {
    const authEnabled = useAuthEnabled();
    const [provider, setProvider] = useState<AiProvider>("groq");
    const [key, setKey] = useState("");
    const [checked, setChecked] = useState(false);
    const [notify, setNotify] = useState<Record<string, boolean>>({ strong: true, digest: true, status: false });

    const rule = keyRules[provider];
    const trimmed = key.trim();
    const formatOk = rule.pattern.test(trimmed) && trimmed.length >= rule.minLength;

    return (
        <div className="max-w-3xl space-y-10">
            <Section title="AI provider" hint="Jobak ranks your matches with your own key. It is encrypted before it is stored and used only for your searches.">
                <Card padding="compact" className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {AI_PROVIDERS.map((option) => (
                            <FilterChip
                                key={option}
                                selected={provider === option}
                                onClick={() => {
                                    setProvider(option);
                                    setChecked(false);
                                }}
                            >
                                {PROVIDER_LABEL[option]}
                            </FilterChip>
                        ))}
                    </div>
                    <Field label={`${PROVIDER_LABEL[provider]} API key`} hint={rule.hint}>
                        <div className="relative">
                            <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-quaternary" />
                            <Input
                                type="password"
                                autoComplete="off"
                                value={key}
                                onChange={(event) => {
                                    setKey(event.target.value);
                                    setChecked(false);
                                }}
                                placeholder="Paste your key"
                                className="pl-9 font-mono"
                            />
                        </div>
                    </Field>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="primary" disabled={!trimmed} onClick={() => setChecked(true)}>
                            Check and save
                        </Button>
                        {checked &&
                            (formatOk ? (
                                <p className="flex items-center gap-1.5 text-[13px] text-score-high">
                                    <Check className="size-4" /> Format looks right. Saving keys is coming soon.
                                </p>
                            ) : (
                                <p className="text-[13px] text-status-rose">That doesn&apos;t look like a {PROVIDER_LABEL[provider]} key. {rule.hint}.</p>
                            ))}
                    </div>
                </Card>
            </Section>

            <Section title="Notifications">
                <Card padding="none" className="divide-y divide-border-subtle">
                    {NOTIFICATIONS.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 p-4">
                            <div>
                                <p className="text-sm font-medium text-fg-primary">{item.label}</p>
                                <p className="mt-0.5 text-[12.5px] text-fg-tertiary">{item.hint}</p>
                            </div>
                            <Toggle
                                label={item.label}
                                on={notify[item.id] ?? false}
                                onChange={(on) => setNotify({ ...notify, [item.id]: on })}
                            />
                        </div>
                    ))}
                </Card>
            </Section>

            <Section title="Account">
                <Card padding="compact" className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="size-5 text-fg-tertiary" />
                        <div>
                            <p className="text-sm font-medium text-fg-primary">{fullName ?? (authEnabled ? "Your account" : "Local owner")}</p>
                            <p className="text-[12.5px] text-fg-tertiary">
                                {authEnabled
                                    ? (email ?? "No email on file")
                                    : "Sign-in is turned off on this instance, so there is no account to manage."}
                            </p>
                        </div>
                    </div>
                    {authEnabled && (
                        <p className="text-[12.5px] text-fg-tertiary">Email, password and sign-in methods: avatar menu → Manage account.</p>
                    )}
                </Card>
            </Section>
        </div>
    );
}
