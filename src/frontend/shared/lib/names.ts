/** "Sam Smith" → "Sam"; no name → null. */
export function firstNameOf(fullName: string | null): string | null {
    return fullName?.trim().split(/\s+/)[0] || null;
}

/** "Sam Smith" → "SS"; no name → first letter of the email; neither → "J". */
export function initialsFor(fullName: string | null, email: string | null): string {
    const fromName = (fullName ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]!.toUpperCase())
        .join("");
    return fromName || email?.charAt(0).toUpperCase() || "J";
}
