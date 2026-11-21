import { X } from "lucide-react";

import { Chip } from "@/frontend/components/ui";

/** The titles added so far, each a chip with a remove button. */
export function ChosenTitles({
    label,
    values,
    onRemove,
}: {
    label: string;
    values: string[];
    onRemove: (title: string) => void;
}) {
    if (values.length === 0) return null;

    return (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${label}, added`}>
            {values.map((value) => (
                <li key={value}>
                    <Chip className="ob-pop py-1 pl-2.5 pr-1 text-[13px]">
                        {value}
                        <button
                            type="button"
                            onClick={() => onRemove(value)}
                            aria-label={`Remove ${value}`}
                            className="rounded p-0.5 text-fg-tertiary hover:bg-white/5 hover:text-fg-primary"
                        >
                            <X className="size-3" />
                        </button>
                    </Chip>
                </li>
            ))}
        </ul>
    );
}
