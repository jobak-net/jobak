/** The list with `value` added, or removed if it was there. */
export const toggle = <T,>(list: readonly T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
