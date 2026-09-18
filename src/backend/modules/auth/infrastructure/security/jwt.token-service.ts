import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

import { ACCESS_TOKEN_TTL_MINUTES } from "../../domain/policies/token-lifetimes.policy";
import type {
  AccessTokenClaims,
  RefreshTokenPair,
  TokenService,
} from "../../domain/ports/token.service.port";

/**
 * The two token types, behind the `TokenService` port.
 *
 * They are deliberately different kinds of thing:
 *
 *   access  — a signed JWT. Carries its own proof, so verifying it touches no
 *             database. That is what makes it cheap enough to check on every
 *             request, and also why it cannot be revoked before it expires.
 *
 *   refresh — opaque randomness. Means nothing on its own; its only value is
 *             the `sessions` row it matches. That indirection is what makes
 *             logout, rotation and reuse detection possible at all.
 *
 * `jose` rather than `jsonwebtoken`: it implements the Web Crypto API, so the
 * same code runs unchanged on Node and in Next's edge runtime should the proxy
 * ever need to verify a token itself.
 */

/** Signing algorithm. HMAC-SHA256 — symmetric, which suits a single service. */
const ALGORITHM = "HS256";

/*
 * `iss` and `aud` are pinned on both sign and verify. With one issuer today
 * this is close to ceremony, but it is the check that stops a token minted for
 * some other purpose — a different environment, a future service sharing the
 * secret — from being accepted here.
 */
const ISSUER = "jobak";
const AUDIENCE = "jobak:app";

/**
 * Allowance for clock drift between the signing and verifying machines. Thirty
 * seconds: enough to absorb ordinary NTP skew across instances, short enough
 * that it does not meaningfully extend the token's life.
 */
const CLOCK_TOLERANCE_SECONDS = 30;

/** Bytes of entropy in a refresh token. 256 bits — unguessable, and not large. */
const REFRESH_TOKEN_BYTES = 32;

/**
 * The signing key, cached after first use.
 *
 * Read lazily rather than at module load: a missing secret should fail the
 * request that needed it, with a message naming the variable, rather than
 * crashing the process at import time where the stack trace points at a barrel
 * file.
 */
let cachedKey: Uint8Array | null = null;

function signingKey(): Uint8Array {
  if (cachedKey) return cachedKey;

  const secret = process.env.AUTH_JWT_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_JWT_SECRET is not set. Generate one with: " +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }

  /*
   * HS256 keys shorter than the hash output (32 bytes) weaken the signature,
   * and a short secret is usually a placeholder someone meant to replace. 64
   * hex characters is what the command above produces.
   */
  if (secret.length < 32) {
    throw new Error(
      `AUTH_JWT_SECRET is too short (${secret.length} chars). Use at least 32; ` +
        "32 random bytes as hex (64 chars) is the intended shape.",
    );
  }

  cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export class JwtTokenService implements TokenService {
  async signAccessToken(claims: AccessTokenClaims): Promise<string> {
    return new SignJWT({ sid: claims.sid })
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(claims.sub)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_TTL_MINUTES}m`)
      .sign(signingKey());
  }

  /**
   * Returns null for anything that does not verify, rather than throwing: an
   * invalid token is an ordinary outcome on a public endpoint — expired
   * session, stale cookie, someone poking at the API — not an exceptional one.
   */
  async verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
    if (!token) return null;

    try {
      const { payload } = await jwtVerify(token, signingKey(), {
        /*
         * Pinning the algorithm list is the important line here. Without it a
         * token could nominate its own `alg` header — the classic attack being
         * `alg: "none"`, or switching an RS256 deployment to HS256 and signing
         * with the public key. `jose` defends against this by default, but
         * stating it makes the guarantee local and unmissable.
         */
        algorithms: [ALGORITHM],
        issuer: ISSUER,
        audience: AUDIENCE,
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
      });

      const { sub, sid } = payload;

      // A token that verifies but lacks the claims we rely on is malformed,
      // not merely invalid — treat it the same, but do not pretend it is usable.
      if (typeof sub !== "string" || typeof sid !== "string") return null;

      return { sub, sid };
    } catch {
      return null;
    }
  }

  /**
   * A refresh token is randomness, not a signed structure: nothing about it is
   * self-describing, so a stolen one is useless without the matching row, and
   * there is no payload to tamper with.
   */
  generateRefreshToken(): RefreshTokenPair {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
    return { token, hash: sha256(token) };
  }

  /**
   * Plain SHA-256, deliberately — not bcrypt.
   *
   * Password hashing is slow to defeat guessing a low-entropy human secret.
   * This token is 256 bits of our own randomness, so guessing is not a threat,
   * and a slow hash on the refresh path would only cost latency. What is needed
   * is that a database leak yields no usable tokens, and a digest gives that.
   */
  hashRefreshToken(token: string): string {
    return sha256(token);
  }
}

/**
 * Constant-time comparison of two hex digests.
 *
 * Refresh lookup goes through a SQL `WHERE refresh_token_hash = $1`, which is
 * not constant-time — but the value being compared there is already a hash of
 * the secret, so a timing oracle reveals nothing usable. This exists for any
 * future path that compares tokens in application code, where it would matter.
 */
export function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");

  // timingSafeEqual throws on differing lengths, which would itself leak.
  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}
