"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
    ArrowLeft,
    ArrowRight,
    BellRing,
    CircleAlert,
    CalendarDays,
    Check,
    Loader2,
    Mail,
    ShieldCheck,
    Sparkles,
    Target,
    UserRound,
} from "lucide-react";

import { StepTabs, stepTabId, useSlideDirection, JobakMark, Button } from "@/frontend/shared/ui";
import { ConnectionPanel, ChooseScreen, KeyScreen, PROVIDER_INFO } from "@/frontend/modules/onboarding";
import { cn } from "@/frontend/shared/lib";
import { useAuthEnabled } from "@/frontend/shared/providers";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";

import { useAiConnection } from "../hooks/use-ai-connection";
import { ModelPicker } from "./model-picker";
import { SavedKeys } from "./saved-keys";

type TabId = "ai" | "notifications" | "account";
const TABS: TabId[] = ["ai", "notifications", "account"];

const TAB_LABEL: Record<TabId, string> = { ai: "AI provider", notifications: "Notifications", account: "Account" };

const NOTIFICATIONS = [
    {
        id: "strong",
        label: "New strong matches",
        hint: "When a job scores 80 or more for you.",
        icon: Target,
        example: { title: "3 new strong matches", body: "Frontend Engineer, Dubai · 92" },
    },
    {
        id: "digest",
        label: "Weekly digest",
        hint: "A Monday summary of the week's best matches.",
        icon: CalendarDays,
        example: { title: "Your week in jobs", body: "41 new matches, 6 above 80" },
    },
    {
        id: "status",
        label: "Application reminders",
        hint: "Nudges to follow up on applications that have gone quiet.",
        icon: BellRing,
        example: { title: "Time to follow up?", body: "No reply from Careem in 10 days" },
    },
] as const;

type NotificationId = (typeof NOTIFICATIONS)[number]["id"];

/**
 * Settings, in the onboarding's shape: numbered tabs across the top, the
 * open one as a large panel with a live companion beside it.
 *
 * The AI tab is the AI onboarding's own screens — the provider cards, the
 * key steps and field, the Jobak ⟷ provider connection — so changing the key
 * later looks and behaves exactly like connecting it the first time.
 *
 * The AI tab is real, in this order: the saved keys (switch, remove), the
 * provider, its model, its key, and one Save for the model and key together
 * (`useAiConnection`). Notifications are still a PREVIEW, kept in this page's state.
 */
export function SettingsPanels({
    email,
    fullName,
    aiSettings,
}: {
    email: string | null;
    fullName: string | null;
    /** `GET /api/v1/ai-settings` (`loadAiSettings`); null when it couldn't be read. */
    aiSettings: AiSettingsResponse | null;
}) {
    const authEnabled = useAuthEnabled();
    const [active, setActive] = useState<TabId>("ai");
    const index = TABS.indexOf(active);
    const direction = useSlideDirection(active, index);

    // ── AI provider ──
    const ai = useAiConnection(aiSettings);
    const { provider } = ai;

    // ── Notifications ──
    const [notify, setNotify] = useState<Record<NotificationId, boolean>>({ strong: true, digest: true, status: false });
    const onCount = Object.values(notify).filter(Boolean).length;

    const name = fullName ?? (authEnabled ? "Your account" : "Local owner");

    const copy: Record<TabId, { title: string; description: string }> = {
        ai: {
            title: "Which AI scores your jobs?",
            description: "Jobak ranks every match with your own key. Switch provider or replace the key any time.",
        },
        notifications: {
            title: "What should Jobak tell you about?",
            description: "Pick the updates worth an email. Everything else stays on your dashboard.",
        },
        account: {
            title: "Your account",
            description: authEnabled
                ? "Who you're signed in as, and where to change how you sign in."
                : "This instance runs without sign-in, so everything belongs to its one local owner.",
        },
    };

    const previous = TABS[index - 1];
    const next = TABS[index + 1];

    return (
        <div className="pb-10">
            <StepTabs
                label="Settings sections"
                idPrefix="settings"
                panelId="settings-panel"
                active={active}
                onSelect={setActive}
                tabs={[
                    {
                        id: "ai",
                        label: TAB_LABEL.ai,
                        summary: ai.preferred
                            ? `${PROVIDER_INFO[ai.preferred].name} · Connected`
                            : aiSettings
                              ? "Not connected"
                              : "Couldn't load",
                    },
                    { id: "notifications", label: TAB_LABEL.notifications, summary: `${onCount} of ${NOTIFICATIONS.length} on` },
                    { id: "account", label: TAB_LABEL.account, summary: authEnabled ? (email ?? name) : "Local owner" },
                ]}
            />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <div
                    id="settings-panel"
                    role="tabpanel"
                    aria-labelledby={stepTabId("settings", active)}
                    className="relative overflow-clip rounded-[24px] border border-border-subtle bg-[radial-gradient(90%_60%_at_0%_0%,oklch(0.82_0.2_145/0.06),transparent_60%)] p-6 sm:p-9"
                >
                    <div key={active} className="ob-step" data-dir={direction}>
                        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-accent-text">
                            {String(index + 1).padStart(2, "0")} · {TAB_LABEL[active]}
                        </p>
                        <h2 className="mt-2 text-[26px] font-semibold leading-[1.1] tracking-[-0.04em] text-fg-primary sm:text-[30px]">
                            {copy[active].title}
                        </h2>
                        <p className="mt-2.5 max-w-[56ch] text-sm leading-relaxed text-fg-tertiary">{copy[active].description}</p>

                        <div className="mt-8">
                            {active === "ai" && (
                                <div className="space-y-10">
                                    {aiSettings && (
                                        <div>
                                            <h3 className="text-[15px] font-medium text-fg-primary">Your saved keys</h3>
                                            <p className="mb-5 mt-1 text-[13px] leading-relaxed text-fg-tertiary">
                                                Your AI tools and match scoring run on the key marked In use. Switch to any
                                                other saved key, or remove one.
                                            </p>
                                            <SavedKeys
                                                connected={ai.connected}
                                                preferred={ai.preferred}
                                                busy={ai.savedKeysBusy}
                                                pendingFor={ai.savedKeysPendingFor}
                                                error={ai.savedKeysError}
                                                onPrefer={ai.prefer}
                                                onRemove={ai.remove}
                                            />
                                        </div>
                                    )}

                                    <div className={aiSettings ? "border-t border-border-subtle pt-8" : undefined}>
                                        <h3 className="mb-5 text-[15px] font-medium text-fg-primary">
                                            {ai.connected.length > 0 ? "Add or replace a key" : "Pick a provider"}
                                        </h3>
                                        <ChooseScreen selected={provider} onSelect={ai.selectProvider} saved={ai.connected} />
                                    </div>

                                    {ai.defaultModel ? (
                                        <div className="border-t border-border-subtle pt-8">
                                            <h3 className="text-[15px] font-medium text-fg-primary">
                                                Which {PROVIDER_INFO[provider].name} model?
                                            </h3>
                                            <p className="mb-5 mt-1 text-[13px] leading-relaxed text-fg-tertiary">
                                                Runs your AI tools. Kept per provider, so switching back keeps your pick.
                                            </p>
                                            <ModelPicker
                                                provider={provider}
                                                providerName={PROVIDER_INFO[provider].name}
                                                defaultModel={ai.defaultModel}
                                                value={ai.model ?? ai.defaultModel}
                                                onChange={ai.pickModel}
                                                unsaved={ai.modelChanged}
                                                disabled={ai.saving}
                                            />
                                        </div>
                                    ) : (
                                        <p className="flex items-center gap-2 border-t border-border-subtle pt-8 text-[13px] text-fg-tertiary">
                                            <CircleAlert className="size-4 shrink-0 text-status-amber" />
                                            Couldn&apos;t load your AI settings. Reload the page to try again.
                                        </p>
                                    )}

                                    <div className="border-t border-border-subtle pt-8">
                                        <h3 className="mb-5 text-[15px] font-medium text-fg-primary">
                                            {ai.isConnected ? `Replace your ${PROVIDER_INFO[provider].name} key` : `Add your ${PROVIDER_INFO[provider].name} key`}
                                        </h3>
                                        {ai.isConnected && (
                                            <p className="-mt-3 mb-5 text-[13px] leading-relaxed text-fg-tertiary">
                                                Your key is saved and never shown again. Leave this empty to keep it, or
                                                paste a new one to replace it.
                                            </p>
                                        )}
                                        {/* Keyed on the provider: its steps, link and field are that provider's. */}
                                        <div key={provider}>
                                            <KeyScreen
                                                provider={provider}
                                                value={ai.key}
                                                onChange={ai.setKey}
                                                error={ai.keyError}
                                                checking={ai.checking}
                                                onSubmit={ai.save}
                                            />
                                        </div>
                                    </div>

                                    {/*
                                      The tab's one Save: the model and the key together, in one
                                      request. While something is unsaved it sticks to the bottom
                                      of the screen, so a pick made at the top of the tab can't be
                                      left behind by not scrolling down to the button.
                                    */}
                                    <div
                                        className={cn(
                                            "flex flex-wrap items-center gap-3 transition-[background-color,border-color,box-shadow] duration-300",
                                            ai.dirty
                                                ? "sticky bottom-4 z-20 rounded-card border border-accent/35 bg-bg-panel p-4 shadow-[0_18px_50px_-18px_rgb(0_0_0/0.9)]"
                                                : "border-t border-border-subtle pt-6",
                                        )}
                                    >
                                        <Button variant="primary" type="button" onClick={ai.save} disabled={!ai.canSave}>
                                            {ai.saving ? <Loader2 className="animate-spin" /> : <Check />}
                                            {ai.saveLabel}
                                        </Button>
                                        {ai.dirty && !ai.saving && (
                                            <Button variant="quiet" type="button" onClick={ai.discard}>
                                                Discard
                                            </Button>
                                        )}
                                        <p aria-live="polite" className="min-w-0 flex-1 text-[13px]">
                                            {ai.saveError ? (
                                                <span role="alert" className="inline-flex items-center gap-1.5 text-status-amber">
                                                    <CircleAlert className="size-3.5" /> {ai.saveError}
                                                </span>
                                            ) : ai.savedFor === provider && !ai.saving ? (
                                                <span className="ob-pop inline-flex items-center gap-1.5 text-accent-text">
                                                    <Check className="size-3.5" /> Saved. Your AI tools use it from the next run.
                                                </span>
                                            ) : ai.unsavedSummary && !ai.saving ? (
                                                <span className="text-fg-secondary">
                                                    Unsaved: {ai.unsavedSummary}
                                                    {!ai.canSave && ai.saveHint ? <span className="text-fg-tertiary">. {ai.saveHint}</span> : null}
                                                </span>
                                            ) : ai.saveHint ? (
                                                <span className="text-fg-tertiary">{ai.saveHint}</span>
                                            ) : null}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {active === "notifications" && (
                                <ul className="space-y-3">
                                    {NOTIFICATIONS.map((item, i) => {
                                        const on = notify[item.id];
                                        const Icon = item.icon;
                                        return (
                                            <li key={item.id} className="ob-rise" style={{ "--i": i } as CSSProperties}>
                                                <label
                                                    className={cn(
                                                        "flex cursor-pointer items-center gap-4 rounded-card border p-4 transition-[background-color,border-color] duration-300",
                                                        on ? "border-accent/45 bg-accent/6" : "border-border-standard bg-white/2 hover:border-border-strong",
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "flex size-10 shrink-0 items-center justify-center rounded-control transition-colors duration-300",
                                                            on ? "bg-accent/15 text-accent" : "bg-white/5 text-fg-tertiary",
                                                        )}
                                                    >
                                                        <Icon className="size-5" />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-[15px] font-medium text-fg-primary">{item.label}</span>
                                                        <span className="mt-0.5 block text-[13px] leading-relaxed text-fg-tertiary">{item.hint}</span>
                                                    </span>
                                                    <Toggle
                                                        label={item.label}
                                                        on={on}
                                                        onChange={(value) => setNotify((all) => ({ ...all, [item.id]: value }))}
                                                    />
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {active === "account" && (
                                <div className="space-y-3">
                                    <div className="ob-rise flex items-center gap-4 rounded-card border border-border-standard bg-white/2 p-4">
                                        <Initials name={fullName} email={email} className="size-12 text-base" />
                                        <div className="min-w-0">
                                            <p className="truncate text-[15px] font-medium text-fg-primary">{name}</p>
                                            <p className="truncate text-[13px] text-fg-tertiary">
                                                {authEnabled ? (email ?? "No email on file") : "Sign-in is turned off on this instance"}
                                            </p>
                                        </div>
                                    </div>

                                    {authEnabled ? (
                                        <>
                                            <InfoRow
                                                index={1}
                                                icon={<Mail className="size-4" />}
                                                title="Email and sign-in methods"
                                                body="Open the avatar menu and choose Manage account."
                                            />
                                            <InfoRow
                                                index={2}
                                                icon={<ShieldCheck className="size-4" />}
                                                title="Password and security"
                                                body="Also under Manage account: password, two-step verification and active devices."
                                            />
                                        </>
                                    ) : (
                                        <InfoRow
                                            index={1}
                                            icon={<UserRound className="size-4" />}
                                            title="No account to manage"
                                            body="Turn sign-in on with AUTH_ENABLED=true and Clerk keys if more than one person will use this instance."
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-10 flex items-center justify-between gap-3 border-t border-border-subtle pt-5">
                        {previous ? (
                            <Button variant="quiet" onClick={() => setActive(previous)}>
                                <ArrowLeft /> {TAB_LABEL[previous]}
                            </Button>
                        ) : (
                            <span />
                        )}
                        {next && (
                            <Button variant="secondary" onClick={() => setActive(next)} className="group">
                                {TAB_LABEL[next]}
                                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* The live companion to the open tab. Wide screens only. */}
                <aside className="hidden xl:block">
                    <div className="sticky top-6 h-[min(720px,calc(100dvh-3rem))]">
                        {active === "ai" && <ConnectionPanel provider={provider} status={ai.status} />}
                        {active === "notifications" && <NotificationsPreview notify={notify} />}
                        {active === "account" && <AccountPanel name={name} fullName={fullName} email={email} authEnabled={authEnabled} />}
                    </div>
                </aside>
            </div>
        </div>
    );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            // The card around it is this switch's <label>, so a click anywhere on the card lands here once.
            onClick={() => onChange(!on)}
            className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300", on ? "bg-accent" : "bg-white/12")}
        >
            <span
                className={cn(
                    "absolute left-0 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    on ? "translate-x-5.5" : "translate-x-0.5",
                )}
            />
        </button>
    );
}

function InfoRow({ index, icon, title, body }: { index: number; icon: ReactNode; title: string; body: string }) {
    return (
        <div
            className="ob-rise flex items-start gap-3 rounded-card border border-border-subtle bg-white/2 p-4"
            style={{ "--i": index } as CSSProperties}
        >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-white/5 text-fg-tertiary">{icon}</span>
            <span className="min-w-0">
                <span className="block text-sm font-medium text-fg-primary">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-fg-tertiary">{body}</span>
            </span>
        </div>
    );
}

/** "Sam Smith" → "SS"; no name → first letter of the email; neither → "J". */
function Initials({ name, email, className }: { name: string | null; email: string | null; className?: string }) {
    const letters =
        (name ?? "")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]!.toUpperCase())
            .join("") ||
        email?.charAt(0).toUpperCase() ||
        "J";
    return (
        <span
            aria-hidden="true"
            className={cn(
                "flex shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent-text",
                className,
            )}
        >
            {letters}
        </span>
    );
}

// ── Right-hand panels (decorative; the left side says it all in words) ─────

function Frame({ pill, icon, title, body, children }: { pill: string; icon: ReactNode; title: string; body: string; children: ReactNode }) {
    return (
        <div
            aria-hidden="true"
            className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(120%_80%_at_50%_0%,oklch(0.82_0.2_145/0.14),transparent_60%),linear-gradient(180deg,#111314,#0b0c0d)]"
        >
            <div className="pointer-events-none absolute -right-40 bottom-0 size-150 bg-[radial-gradient(closest-side,oklch(0.82_0.2_145/0.08),transparent)]" />
            <header className="relative z-10 px-10 pt-14 text-center xl:px-16">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-medium text-[#0b0c0d]">
                    {icon} {pill}
                </span>
                <h2 className="ob-headline mx-auto mt-5 max-w-[22ch] text-[30px] font-semibold leading-[1.1] tracking-[-0.035em] text-fg-primary xl:text-[34px]">
                    {title}
                </h2>
                <p
                    className="ob-headline mx-auto mt-3 max-w-[44ch] text-sm leading-relaxed text-fg-tertiary"
                    style={{ "--ob-delay": "90ms" } as CSSProperties}
                >
                    {body}
                </p>
            </header>
            <div className="relative flex flex-1 items-center justify-center px-10 pb-10">{children}</div>
        </div>
    );
}

/** Example notifications, one per setting; switched-off ones fade back. */
function NotificationsPreview({ notify }: { notify: Record<NotificationId, boolean> }) {
    const on = Object.values(notify).filter(Boolean).length;
    return (
        <Frame
            pill="Examples"
            icon={<BellRing className="size-3" strokeWidth={2.5} />}
            title={on === 0 ? "A quiet inbox." : "Only what's worth it."}
            body={on === 0 ? "No emails at all. Your matches still collect on the dashboard." : "This is the kind of email you'll get, and nothing more."}
        >
            <ul className="w-full max-w-sm space-y-3">
                {NOTIFICATIONS.map((item, i) => {
                    const isOn = notify[item.id];
                    const Icon = item.icon;
                    return (
                        <li
                            key={item.id}
                            className={cn(
                                "ob-rise flex items-start gap-3 rounded-[16px] border p-4 transition-[opacity,filter,translate] duration-500",
                                isOn
                                    ? "translate-x-0 border-white/10 bg-[#121415]/95 opacity-100"
                                    : "translate-x-3 border-white/5 bg-[#121415]/60 opacity-35 grayscale",
                            )}
                            style={{ "--i": i } as CSSProperties}
                        >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/8 bg-[#16191a]">
                                <JobakMark size={18} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center justify-between gap-2">
                                    <span className="truncate text-[13px] font-medium text-fg-primary">{item.example.title}</span>
                                    <span className="shrink-0 text-[11px] text-fg-quaternary">{isOn ? "now" : "off"}</span>
                                </span>
                                <span className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-fg-tertiary">
                                    <Icon className="size-3 shrink-0" /> {item.example.body}
                                </span>
                            </span>
                        </li>
                    );
                })}
            </ul>
        </Frame>
    );
}

function AccountPanel({
    name,
    fullName,
    email,
    authEnabled,
}: {
    name: string;
    fullName: string | null;
    email: string | null;
    authEnabled: boolean;
}) {
    return (
        <Frame
            pill="Account"
            icon={<Sparkles className="size-3" strokeWidth={2.5} />}
            title={authEnabled ? `Signed in as ${fullName?.split(/\s+/)[0] ?? "you"}.` : "Running locally."}
            body={
                authEnabled
                    ? "Your preferences, matches and AI key are tied to this account."
                    : "No sign-in on this instance. Everything here belongs to its local owner."
            }
        >
            <div className="relative flex size-72 items-center justify-center">
                {[140, 104].map((r) => (
                    <span
                        key={r}
                        className="ob-orbit absolute rounded-full border border-dashed border-white/8"
                        style={{ width: r * 2, height: r * 2, "--ob-orbit": r === 140 ? "90s" : "60s" } as CSSProperties}
                    />
                ))}
                <span className="absolute size-32 rounded-full bg-[radial-gradient(closest-side,oklch(0.82_0.2_145/0.25),transparent)]" />
                <div className="relative flex flex-col items-center">
                    <Initials name={fullName} email={email} className="size-24 border border-accent/40 text-3xl" />
                    <p className="mt-4 max-w-[16rem] truncate text-sm font-medium text-fg-primary">{name}</p>
                    {authEnabled && email && <p className="max-w-[16rem] truncate text-[12px] text-fg-tertiary">{email}</p>}
                </div>
            </div>
        </Frame>
    );
}
