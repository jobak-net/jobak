/**
 * The contract of `GET /api/v1/me`: what the backend answers and the frontend
 * reads. Imports nothing (see `../referral-cookie` for the rule of this folder).
 *
 *   200  AccountStatus           signed in
 *   401  { error }               nobody is signed in
 *   503  { error }               couldn't tell — the database, typically.
 *                                Not the same as 401: treating it as signed out
 *                                sends a signed-in user to /login, which sends
 *                                them straight back, in a loop.
 */

export const ACCOUNT_API_PATH = "/api/v1/me";

/** The signed-in viewer, as much as pages need to decide where they belong. */
export interface AccountStatus {
  user: {
    fullName: string | null;
    email: string | null;
  };
  /** Has answered the onboarding job questions. */
  onboarded: boolean;
}
