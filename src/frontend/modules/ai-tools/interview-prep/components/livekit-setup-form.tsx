"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Check, CircleAlert, Copy, ExternalLink, Loader2 } from "lucide-react";

import { Button, Field, Input } from "@/frontend/shared/ui";
import { cn } from "@/frontend/shared/lib";

import { LIVEKIT_SETUP_STEPS, useLiveKitSetupForm } from "../hooks/use-livekit-setup-form";
import { EVALUATION_TOOL } from "../lib/evaluation";
import { INTERVIEWER_GREETING, INTERVIEWER_INSTRUCTIONS, METADATA_KEYS } from "../lib/interviewer-instructions";
import { LiveKitSetupError } from "../lib/livekit-settings";
import { LiveKitStepper, MenuPath } from "./livekit-stepper";

const LIVEKIT_CLOUD_URL = "https://cloud.livekit.io";

const URL_PASTED = "That's a URL. Paste the Token server ID instead: it's the field just above the URL in LiveKit.";

function saveErrorText(error: unknown): string {
    if (error instanceof LiveKitSetupError) {
        if (error.kind === "url") return URL_PASTED;
        return error.kind === "rejected"
            ? "LiveKit didn't accept this token server ID. Copy it from Settings › General › Options › Development token server in LiveKit (not the project or agent ID)."
            : "LiveKit couldn't be reached. Check your connection.";
    }
    return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

function CopyButton({ text, label }: { text: string; label: string }) {
    const [copied, setCopied] = useState(false);
    async function copy() {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard blocked: the text is shown in Settings to select by hand */
        }
    }
    return (
        <Button type="button" variant="secondary" size="sm" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : label}
        </Button>
    );
}

/** The evaluation tool's parameters, one row each with a copy button for its description (Builder asks for each). */
function ToolParameters() {
    return (
        <ul className="mt-2.5 divide-y divide-border-subtle rounded-control border border-border-subtle">
            {EVALUATION_TOOL.parameters.map((parameter) => (
                <li key={parameter.name} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2">
                    <code className="text-[12px] font-medium text-fg-primary">{parameter.name}</code>
                    <span className="text-[12px] text-fg-quaternary">{parameter.type}, required</span>
                    <span className="ml-auto">
                        <CopyButton text={parameter.description} label="Copy description" />
                    </span>
                </li>
            ))}
        </ul>
    );
}

/** What to do on each Agent Builder tab, keyed by the tab's name as LiveKit shows it, with the texts to paste there. */
const BUILDER_TABS: { tab: string; todo: string; copy?: { text: string; label: string }[]; parameters?: boolean }[] = [
    {
        tab: "Conversation",
        todo: "Replace the instructions and the welcome message with ours. A warning about unrecognized variables is expected until the Advanced row is done.",
        copy: [
            { text: INTERVIEWER_INSTRUCTIONS, label: "Copy instructions" },
            { text: INTERVIEWER_GREETING, label: "Copy welcome message" },
        ],
    },
    {
        tab: "Actions",
        todo: `This is how the interviewer sends your feedback at the end. Under Client tools, press Add client tool: name it ${EVALUATION_TOOL.name}, paste the description, add these four parameters, turn Silent on, and press Add tool.`,
        copy: [
            { text: EVALUATION_TOOL.name, label: "Copy tool name" },
            { text: EVALUATION_TOOL.description, label: "Copy description" },
        ],
        parameters: true,
    },
    {
        tab: "Advanced",
        todo: "Name the agent (for example jobak-interviewer), then add four String variables under Custom metadata: role, company, job_description, candidate_name.",
        copy: [{ text: METADATA_KEYS.join(", "), label: "Copy variable names" }],
    },
    { tab: "Deploy agent", todo: "Press it, and wait until the deployment has completed." },
];

/**
 * Connect the user's LiveKit project, as a three-step wizard: turn on the
 * token server, create the interviewer in Agent Builder (texts to copy),
 * paste the token server ID and the agent's name. Only the ID is asked for:
 * LiveKit's answer to it carries the project's URL, which is saved and shown.
 * Used in the locked page's card (`compact`) and in Settings; saving unlocks
 * the page in place. State lives in `useLiveKitSetupForm`.
 */
export function LiveKitSetupForm({ accountId, variant = "full" }: { accountId: string; variant?: "full" | "compact" }) {
    const id = useId();
    const form = useLiveKitSetupForm(accountId);
    const { livekit, step } = form;
    const compact = variant === "compact";

    // Moving between steps puts focus on the new step's heading, so keyboard
    // and screen reader users land on what just appeared (not on first render).
    const headingRef = useRef<HTMLHeadingElement>(null);
    const moved = useRef(false);
    useEffect(() => {
        if (moved.current) headingRef.current?.focus();
    }, [step]);
    const goTo = (next: number) => {
        moved.current = true;
        form.goTo(next);
    };

    const current = LIVEKIT_SETUP_STEPS[step];
    const next = LIVEKIT_SETUP_STEPS[step + 1];

    return (
        <form onSubmit={form.submit}>
            <LiveKitStepper steps={LIVEKIT_SETUP_STEPS} current={step} onSelect={goTo} />

            <div role="group" aria-labelledby={`${id}-step`} className="mt-7">
                <h3
                    id={`${id}-step`}
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-[15px] font-medium tracking-[-0.01em] text-fg-primary outline-none"
                >
                    <span className="sr-only">
                        Step {step + 1} of {LIVEKIT_SETUP_STEPS.length}:{" "}
                    </span>
                    {current.title}
                </h3>

                <div className="mt-3 text-[13px] leading-relaxed text-fg-tertiary">
                    {step === 0 && (
                        <>
                            <MenuPath items={["Settings", "General", "Options"]} />
                            <p>
                                Switch on Development token server and copy the Token server ID. Keep it private: anyone with it can start
                                calls on your LiveKit account.
                            </p>
                            <Button variant="secondary" size="sm" asChild className="mt-4">
                                <a href={LIVEKIT_CLOUD_URL} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink /> Open LiveKit Cloud
                                </a>
                            </Button>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <MenuPath items={["Agents", "Create agent", "Create in browser using Agent Builder"]} />
                            <p>Pick the 1-to-1 training template and press Create. Then, in Agent Builder:</p>
                            <dl className="mt-3 divide-y divide-border-subtle rounded-card border border-border-subtle bg-white/2">
                                {BUILDER_TABS.map(({ tab, todo, copy, parameters }) => (
                                    <div key={tab} className="px-4 py-3">
                                        <dt className="font-medium text-fg-secondary">{tab}</dt>
                                        <dd className="mt-0.5">
                                            {todo}
                                            {copy && (
                                                <span className="mt-2 flex flex-wrap gap-2">
                                                    {copy.map((item) => (
                                                        <CopyButton key={item.label} text={item.text} label={item.label} />
                                                    ))}
                                                </span>
                                            )}
                                            {parameters && <ToolParameters />}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                            {!compact && (
                                <details className="mt-3">
                                    <summary className="cursor-pointer text-[12px] text-fg-secondary">See the instructions</summary>
                                    <pre className="mt-2 max-h-56 overflow-auto rounded-control border border-border-subtle bg-white/2 p-3 text-[12px] whitespace-pre-wrap text-fg-tertiary">
                                        {INTERVIEWER_INSTRUCTIONS}
                                    </pre>
                                </details>
                            )}
                        </>
                    )}

                    {step === 2 && (
                        <>
                            {/* Inputs sit at the bottom of each field, so they line up whichever hint wraps. */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label={livekit.status === "saved" ? "New token server ID" : "Token server ID"}
                                    hint="Only the ID. Jobak gets your project's URL from LiveKit."
                                    htmlFor={`${id}-server`}
                                    controlAtBottom
                                >
                                    <Input
                                        id={`${id}-server`}
                                        type="password"
                                        autoComplete="off"
                                        spellCheck={false}
                                        aria-invalid={form.pastedUrl || undefined}
                                        aria-describedby={form.pastedUrl ? `${id}-server-url` : undefined}
                                        value={form.tokenServerId}
                                        onChange={(event) => form.setTokenServerId(event.target.value)}
                                    />
                                </Field>
                                <Field
                                    label="Agent name"
                                    hint="As you named it on the Advanced tab."
                                    htmlFor={`${id}-agent`}
                                    controlAtBottom
                                >
                                    <Input
                                        id={`${id}-agent`}
                                        autoComplete="off"
                                        spellCheck={false}
                                        placeholder="jobak-interviewer"
                                        value={form.agentName}
                                        onChange={(event) => form.setAgentName(event.target.value)}
                                    />
                                </Field>
                            </div>
                            {form.pastedUrl && (
                                <p id={`${id}-server-url`} className="mt-3 flex items-start gap-1.5 text-[12px] text-status-amber">
                                    <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> {URL_PASTED}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="mt-7 flex items-center gap-3 border-t border-border-subtle pt-5">
                {step > 0 && (
                    <Button type="button" variant="quiet" onClick={() => goTo(step - 1)}>
                        <ArrowLeft /> Back
                    </Button>
                )}
                {next ? (
                    <Button type="button" variant="primary" className="ml-auto" onClick={() => goTo(step + 1)}>
                        Next: {next.label.toLowerCase()}
                    </Button>
                ) : (
                    <Button type="submit" variant="primary" disabled={!form.canConnect} className={cn("ml-auto", compact && "flex-1")}>
                        {livekit.saving ? <Loader2 className="animate-spin" /> : <Check />}
                        {compact ? "Connect and unlock" : "Connect"}
                    </Button>
                )}
            </div>

            <p aria-live="polite" className="mt-3 text-[13px]">
                {livekit.saveError ? (
                    <span role="alert" className="flex items-start gap-1.5 text-status-amber">
                        <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> {saveErrorText(livekit.saveError)}
                    </span>
                ) : form.saved ? (
                    <span className="flex items-center gap-1.5 text-accent-text">
                        <Check className="size-3.5" />
                        {form.host ? `Connected to ${form.host}. Saved in this browser.` : "Connected. Saved in this browser."}
                    </span>
                ) : null}
            </p>
        </form>
    );
}
