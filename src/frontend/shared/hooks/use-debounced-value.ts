"use client";

import { useEffect, useState } from "react";

/**
 * `value`, but only once it has stopped changing for `delayMs` — so a search
 * box can ask the backend for what the user settled on, not every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}
