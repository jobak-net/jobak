/**
 * What registration produces.
 *
 * Deliberately not an `AuthResult`: no tokens, no session. The account exists
 * but cannot be used until the address is confirmed, and returning a token
 * shape here would invite a caller to set cookies that grant nothing.
 *
 * The email is echoed back so the "we sent a link to …" page can name the
 * address without the client having to hold the form state across a redirect.
 */
export interface RegistrationResult {
  email: string;
  /**
   * Always true today. Present so that if a future flow ever auto-verifies —
   * an invited user, say, arriving through a link that already proves the
   * address — callers are reading a fact rather than assuming one.
   */
  verificationRequired: boolean;
}
