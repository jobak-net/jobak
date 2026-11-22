"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { errorMessageOf } from "@/frontend/shared/api";
import { FEEDBACK_MESSAGE_MIN, type FeedbackCategory } from "@/shared/contracts/feedback";

import { useSendFeedback } from "../api/feedback.mutations";

/**
 * Everything the feedback form does, apart from drawing it: the fields, the
 * honeypot, sending, and the "sent" state.
 */
export function useFeedbackForm() {
    const pathname = usePathname();
    /*
     * When the form appeared, sent with the submission: a form completed in
     * under three seconds was not completed by a person (the server's check,
     * `SubmitFeedbackUseCase`).
     *
     * Stamped in an effect rather than as `useRef(Date.now())` — reading the
     * clock during render is impure, and React may render a component more than
     * once before committing it.
     */
    const openedAt = useRef<number | null>(null);
    useEffect(() => {
        openedAt.current = Date.now();
    }, []);

    const [category, setCategory] = useState<FeedbackCategory>("bug");
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState("");
    const [website, setWebsite] = useState(""); // honeypot
    /** Set once sent: whether an address came with it, for the thank-you's wording. */
    const [sent, setSent] = useState<{ withEmail: boolean } | null>(null);
    const send = useSendFeedback();

    const length = message.trim().length;
    const tooShort = length > 0 && length < FEEDBACK_MESSAGE_MIN;

    function submit(event: React.FormEvent) {
        event.preventDefault();
        send.mutate(
            {
                category,
                message,
                email,
                website,
                pagePath: pathname,
                openedAt: openedAt.current ?? undefined,
            },
            {
                onSuccess: () => {
                    setSent({ withEmail: email.trim().length > 0 });
                    setMessage("");
                    setEmail("");
                },
            },
        );
    }

    function sendAnother() {
        setSent(null);
        send.reset();
        // Restart the clock, or the second message trips the speed check that
        // the first one legitimately passed.
        openedAt.current = Date.now();
    }

    return {
        category,
        setCategory,
        message,
        setMessage,
        length,
        tooShort,
        email,
        setEmail,
        website,
        setWebsite,
        sent,
        sendAnother,
        submit,
        pending: send.isPending,
        canSend: !send.isPending && length >= FEEDBACK_MESSAGE_MIN,
        error: send.error ? errorMessageOf(send.error) : null,
    };
}
