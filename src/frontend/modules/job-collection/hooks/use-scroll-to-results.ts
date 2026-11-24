"use client";

import { useEffect, useRef, type RefObject } from "react";

import { shouldScrollToResults } from "../lib/scroll-to-results";

/**
 * Brings the results into view when a search finishes with jobs: smoothly,
 * or at once for people who ask for reduced motion. Scrolls the page only;
 * no state changes.
 */
export function useScrollToResults(target: RefObject<HTMLElement | null>, collecting: boolean, jobCount: number) {
    const wasCollecting = useRef(collecting);

    useEffect(() => {
        if (shouldScrollToResults({ wasCollecting: wasCollecting.current, collecting, jobCount })) {
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            target.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        }
        wasCollecting.current = collecting;
    }, [target, collecting, jobCount]);
}
