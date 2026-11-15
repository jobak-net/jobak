"use client";

import { useId, useState } from "react";
import { Plus, X } from "lucide-react";

import { Button, Chip, Input } from "@/frontend/components/ui";

/**
 * A list of short free-text values, added one at a time and shown as chips.
 *
 * Adds on Enter or the Add button, removes from each chip. De-duplication and
 * trimming happen in the onboarding reducer (`applySearchRules`), so this only
 * collects what was typed.
 */
export function TagInput({
    label,
    hint,
    values,
    onChange,
    placeholder,
}: {
    label: string;
    hint?: string;
    values: string[];
    onChange: (next: string[]) => void;
    placeholder: string;
}) {
    const id = useId();
    const [draft, setDraft] = useState("");

    function add() {
        const value = draft.trim();
        if (value) onChange([...values, value]);
        setDraft("");
    }

    return (
        <div>
            <label htmlFor={id} className="text-sm font-medium text-fg-secondary">
                {label}
            </label>
            {hint && <p className="mt-0.5 text-[13px] text-fg-tertiary">{hint}</p>}

            <div className="mt-2.5 flex gap-2">
                <Input
                    id={id}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            add();
                        }
                    }}
                    placeholder={placeholder}
                />
                <Button type="button" variant="secondary" onClick={add} disabled={!draft.trim()}>
                    <Plus /> Add
                </Button>
            </div>

            {values.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${label}, added`}>
                    {values.map((value) => (
                        <li key={value}>
                            <Chip className="ob-pop py-1 pl-2.5 pr-1 text-[13px]">
                                {value}
                                <button
                                    type="button"
                                    onClick={() => onChange(values.filter((v) => v !== value))}
                                    aria-label={`Remove ${value}`}
                                    className="rounded p-0.5 text-fg-tertiary hover:bg-white/5 hover:text-fg-primary"
                                >
                                    <X className="size-3" />
                                </button>
                            </Chip>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
