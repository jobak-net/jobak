import { FEEDBACK_MESSAGE_MAX, FEEDBACK_MESSAGE_MIN } from "@/shared/contracts/feedback";

const INPUT =
    "w-full rounded-xl border border-border-standard bg-white/2 px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:border-accent/50 focus:outline-none transition-colors";

/** "What happened?" — the message, with its length counter. */
export function MessageField({
    value,
    onChange,
    length,
    tooShort,
}: {
    value: string;
    onChange: (next: string) => void;
    /** Trimmed length, as the server counts it. */
    length: number;
    tooShort: boolean;
}) {
    return (
        <div>
            <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1.5">
                What happened?
            </label>
            <p className="text-xs text-muted-foreground mb-2">
                If it is a listing, paste the link. If it is a bug, what you clicked and what happened
                instead.
            </p>
            <textarea
                id="message"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                rows={7}
                maxLength={FEEDBACK_MESSAGE_MAX}
                required
                className={`${INPUT} resize-y`}
            />
            <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                {length} / {FEEDBACK_MESSAGE_MAX}
                {tooShort && <span className="text-(--status-amber)"> — need at least {FEEDBACK_MESSAGE_MIN}</span>}
            </p>
        </div>
    );
}

/** The optional reply address. */
export function EmailField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
    return (
        <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email <span className="font-normal text-muted-foreground">— only if you want a reply</span>
            </label>
            <input
                id="email"
                type="email"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="you@example.com"
                className={INPUT}
            />
        </div>
    );
}

/**
 * Honeypot. Hidden from people and from screen readers, left empty by any real
 * submission — and `tabIndex={-1}` keeps it out of keyboard navigation so
 * nobody can land in it by accident.
 */
export function HoneypotField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
    return (
        <div aria-hidden="true" className="absolute w-px h-px -left-[9999px] overflow-hidden">
            <label htmlFor="website">Website</label>
            <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
}
