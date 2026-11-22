import { countryName } from "@/shared/countries";
import type { JobPreferences } from "@/shared/contracts/preferences";

/** "3 roles in Egypt and the UAE", "1 role, remote from anywhere" — the user's own search, in one line. */
export function describeSearch(p: JobPreferences | null): string {
    if (!p) return "your roles and locations";
    const roles = `${p.jobTitles.length} ${p.jobTitles.length === 1 ? "role" : "roles"}`;
    if (p.location.worldwide) return `${roles}, remote from anywhere`;

    const names = p.location.countries.map(countryName);
    const where =
        names.length <= 2 ? names.join(" and ") : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
    return where ? `${roles} in ${where}` : roles;
}
