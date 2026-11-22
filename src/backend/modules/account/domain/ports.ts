/**
 * What the account module reads, answered by other modules (see
 * `../composition.ts`): who is signed in comes from auth, onboarding from
 * preferences.
 */

export interface SignedInUser {
  id: string;
  fullName: string | null;
  email: string | null;
}

export interface AccountSources {
  /** The signed-in user, null when nobody is. Throws when it can't be read. */
  currentUser(): Promise<SignedInUser | null>;
  /** Throws when it can't be read. */
  hasCompletedOnboarding(userId: string): Promise<boolean>;
}
