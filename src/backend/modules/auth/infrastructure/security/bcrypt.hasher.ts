import "server-only";

import { compare, hash } from "bcryptjs";

import type { PasswordHasher } from "../../domain/ports/password-hasher.port";

/**
 * bcrypt, behind the `PasswordHasher` port.
 *
 * `bcryptjs` rather than the native `bcrypt`: it is pure JavaScript, so there
 * is no node-gyp build step and no prebuilt-binary mismatch when the same
 * lockfile is installed on Windows locally and Linux on the deploy host. It is
 * slower than the native binding, which for password hashing is not a downside
 * — the cost is the point.
 */

/**
 * Work factor. Each increment doubles the time to hash.
 *
 * 12 is the current OWASP recommendation for bcrypt. Measured here at ~250ms
 * with a warm JIT (the first call in a cold process takes roughly twice that).
 * Slow enough to make offline cracking of a leaked hash expensive, fast enough
 * that a login does not feel stalled.
 *
 * Raising it later is safe: the cost is encoded in every stored hash, so old
 * passwords keep verifying under the factor they were created with. See
 * `needsRehash` for migrating them.
 */
const COST = 12;

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(plaintext: string): Promise<string> {
    /*
     * No length guard here on purpose: `Password.create` already rejects
     * anything over bcrypt's 72-byte limit, and duplicating the rule would mean
     * two places to keep in step. This is the plug, not the policy.
     */
    return hash(plaintext, COST);
  }

  /**
   * Constant-time comparison, delegated to bcrypt's own `compare` — it compares
   * the derived hashes rather than the inputs, so the time taken does not
   * depend on how many leading characters happened to match.
   */
  async verify(plaintext: string, storedHash: string): Promise<boolean> {
    /*
     * The port requires false rather than a throw for a malformed or empty
     * hash. An account with no password (`password_hash IS NULL`) reaches here
     * as an empty string, and bcrypt throws on that — which would turn an
     * ordinary "you can't sign in with a password" into a 500.
     */
    if (!storedHash) return false;

    try {
      return await compare(plaintext, storedHash);
    } catch {
      // A hash that bcrypt cannot parse is corrupt data, not a valid login.
      return false;
    }
  }
}

/**
 * True when a stored hash was made with a weaker cost than we now use.
 *
 * Not part of the port because it is specific to cost-parameterised algorithms.
 * The intended use is opportunistic: on a successful login, if this returns
 * true, re-hash the plaintext we have just verified — it is the only moment the
 * plaintext is available.
 *
 * Unused for now; wired in when login lands in step 5.
 */
export function needsRehash(storedHash: string): boolean {
  // Format: $2b$<cost>$<salt+digest>
  const parts = storedHash.split("$");
  if (parts.length < 4) return false;

  const cost = Number.parseInt(parts[2], 10);
  return Number.isFinite(cost) && cost < COST;
}
