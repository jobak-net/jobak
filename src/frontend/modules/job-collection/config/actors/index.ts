import type { ActorEntry } from "../../types/catalogue";
import { CAREER_SITE_ACTORS } from "./career-sites";
import { EUROPE_ACTORS } from "./europe";
import { FREELANCE_ACTORS } from "./freelance";
import { LATIN_AMERICA_ACTORS } from "./latin-america";
import { MENA_ACTORS } from "./mena";
import { REMOTE_ACTORS } from "./remote";
import { SOUTH_ASIA_ACTORS } from "./south-asia";
import { SOUTHEAST_ASIA_ACTORS } from "./southeast-asia";
import { WORLDWIDE_ACTORS } from "./worldwide";

/** Every actor in the catalogue, in category order (docs/features/JOB_COLLECTION.md). */
export const ACTORS: readonly ActorEntry[] = [
    ...MENA_ACTORS,
    ...WORLDWIDE_ACTORS,
    ...REMOTE_ACTORS,
    ...FREELANCE_ACTORS,
    ...CAREER_SITE_ACTORS,
    ...SOUTH_ASIA_ACTORS,
    ...SOUTHEAST_ASIA_ACTORS,
    ...EUROPE_ACTORS,
    ...LATIN_AMERICA_ACTORS,
];

export function actorById(id: string): ActorEntry | undefined {
    return ACTORS.find((entry) => entry.id === id);
}
