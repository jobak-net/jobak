import type { ExternalIdentity } from "./identity.entity";

/**
 * Something the identity provider reports about a person, already verified
 * and translated into our terms. What the sync applies to `users`.
 *
 *  - `upserted`: created or changed — write the profile.
 *  - `deleted`: gone — delete the row (preferences, matches, keys cascade).
 *  - `ignored`: an event we don't act on.
 */
export type IdentityEvent =
  | { type: "upserted"; identity: ExternalIdentity }
  | { type: "deleted"; externalId: string }
  | { type: "ignored"; providerEvent: string };
