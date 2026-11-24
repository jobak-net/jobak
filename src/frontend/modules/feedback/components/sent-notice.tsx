import { Check } from "lucide-react";

/** What replaces the form once it's sent. */
export function SentNotice({ withEmail, onSendAnother }: { withEmail: boolean; onSendAnother: () => void }) {
    return (
        <div className="mt-12 max-w-xl rounded-2xl border border-accent/40 bg-accent/6 p-6">
            <p className="flex items-center gap-2 font-semibold text-foreground">
                <Check className="w-4 h-4 text-accent" />
                Sent. Thank you.
            </p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {withEmail
                    ? "If it needs a reply, you'll get one at the address you gave."
                    : "You didn't leave an address, so there's no way to reply — but it is read."}
            </p>
            <button
                type="button"
                onClick={onSendAnother}
                className="mt-4 text-sm text-accent underline underline-offset-2"
            >
                Send another
            </button>
        </div>
    );
}
