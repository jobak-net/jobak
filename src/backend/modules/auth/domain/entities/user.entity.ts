/**
 * The user as the app understands them: our own id, and who they are upstream.
 *
 * Identity itself — passwords, sessions, verification — belongs to the identity
 * provider now (Clerk, or the local owner when auth is disabled). What stays
 * here is the row every other table points at: `users.id` is the foreign key on
 * preferences, matches, profiles and feedback, and it stays a UUID we mint, so
 * none of those tables care which provider is in use.
 *
 * Profile, preferences and onboarding state deliberately live in other tables
 * and other modules. Widening this type is how a module stops having a boundary.
 */

export interface User {
  id: string;
  /**
   * The provider's id for this person — a Clerk `user_…` id, or the fixed
   * local-owner id when auth is disabled. Unique; the lookup key on every
   * request.
   */
  externalId: string;
  /**
   * Null when the provider has none. Clerk can be configured for phone- or
   * username-only sign-in, and an invented placeholder would be worse than an
   * honest gap.
   */
  email: string | null;
  fullName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * What leaves the module.
 *
 * `externalId` is absent on purpose: it is the provider's key, and code outside
 * this module that keyed off it would break the moment the provider changed.
 * Everything else in the app scopes by `id`.
 */
export interface PublicUser {
  id: string;
  email: string | null;
  fullName: string | null;
  createdAt: Date;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    createdAt: user.createdAt,
  };
}
