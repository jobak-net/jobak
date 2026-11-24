/** Test helpers: a `Storage` kept in memory, and one that throws like a blocked `localStorage`. */

export function memoryStorage(): Storage {
    const values = new Map<string, string>();
    return {
        get length() {
            return values.size;
        },
        clear: () => values.clear(),
        getItem: (key) => values.get(key) ?? null,
        key: (index) => [...values.keys()][index] ?? null,
        removeItem: (key) => void values.delete(key),
        setItem: (key, value) => void values.set(key, String(value)),
    };
}

export function blockedStorage(): Storage {
    const blocked = () => {
        throw new DOMException("The operation is insecure.", "SecurityError");
    };
    return {
        get length() {
            return blocked();
        },
        clear: blocked,
        getItem: blocked,
        key: blocked,
        removeItem: blocked,
        setItem: blocked,
    };
}
