"use client";

import { Loader2, Send } from "lucide-react";

import { CategoryPicker } from "./category-picker";
import { EmailField, HoneypotField, MessageField } from "./fields";
import { SentNotice } from "./sent-notice";
import { useFeedbackForm } from "./use-feedback-form";

/**
 * The feedback form.
 *
 * Open to anyone, signed in or not, because the people most able to tell us a
 * listing is wrong are the ones who bounced off the product before making an
 * account. Nothing here is required except a category and a sentence — an email
 * field that must be filled is a filter on who bothers to report anything.
 *
 * State and sending are `useFeedbackForm`; it posts to `POST /api/v1/feedback`.
 */
export function FeedbackForm() {
    const form = useFeedbackForm();

    if (form.sent) return <SentNotice withEmail={form.sent.withEmail} onSendAnother={form.sendAnother} />;

    return (
        <form onSubmit={form.submit} className="mt-12 max-w-xl space-y-6">
            <CategoryPicker value={form.category} onChange={form.setCategory} />
            <MessageField value={form.message} onChange={form.setMessage} length={form.length} tooShort={form.tooShort} />
            <EmailField value={form.email} onChange={form.setEmail} />
            <HoneypotField value={form.website} onChange={form.setWebsite} />

            {form.error && (
                <p role="alert" className="text-sm text-(--status-rose) border-l-2 border-(--status-rose) pl-3 py-1">
                    {form.error}
                </p>
            )}

            <button
                type="submit"
                disabled={!form.canSend}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-(--bg-canvas) font-semibold text-sm hover:bg-accent-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {form.pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
            </button>
        </form>
    );
}
