import "server-only";

import {
  GetCurrentUserUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshSessionUseCase,
  RegisterUseCase,
  RequestPasswordResetUseCase,
  ResendVerificationUseCase,
  ResetPasswordUseCase,
  VerifyEmailUseCase,
} from "./application/use-cases";
import {
  SessionIssuer,
  VerificationLinkBuilder,
  resolveBaseUrl,
} from "./application/services";
import type { EmailSender } from "./domain/ports/email-sender.port";
import type { RateLimiter } from "./domain/ports/rate-limiter.port";
import { ConsoleEmailSender, ResendEmailSender } from "./infrastructure/email";
import {
  PgAuthTokenRepository,
  PgRateLimiter,
  PgSessionRepository,
  PgUserRepository,
} from "./infrastructure/repositories";
import { BcryptPasswordHasher, JwtTokenService } from "./infrastructure/security";

/**
 * The composition root: the one place that decides which implementations the
 * use cases get.
 *
 * This is why nothing in `application/` imports from `infrastructure/` — the
 * wiring lives here instead, so the use cases stay testable with fakes and the
 * choice of Postgres, bcrypt and jose is made once, visibly.
 *
 * Route handlers import the assembled use cases from here and nothing else.
 */

/**
 * Built once per process and cached on `globalThis`, for the same reason the
 * pool is: Next's dev server re-evaluates modules on every hot reload, and a
 * fresh set of repositories per edit would be wasteful at best.
 *
 * The objects are stateless — they hold ports, not connections — so sharing
 * them across requests is safe. The pool underneath does its own management.
 */
const globalForAuth = globalThis as unknown as { authModule?: AuthModule };

export interface AuthModule {
  register: RegisterUseCase;
  login: LoginUseCase;
  logout: LogoutUseCase;
  refresh: RefreshSessionUseCase;
  verifyEmail: VerifyEmailUseCase;
  resendVerification: ResendVerificationUseCase;
  requestPasswordReset: RequestPasswordResetUseCase;
  resetPassword: ResetPasswordUseCase;
  getCurrentUser: GetCurrentUserUseCase;
  /**
   * Exposed directly rather than wrapped in a use case: rate limiting is a
   * property of the HTTP edge, not of any single operation, and the route
   * handlers are what know which limit applies.
   */
  rateLimiter: RateLimiter;
}

/**
 * Picks the mail implementation.
 *
 * Configuration decides, not the environment: `RESEND_API_KEY` being set means
 * "send real mail", whether that is production or a developer testing the
 * actual delivery path. Without it, development prints links to the console and
 * production refuses to start — a deploy that silently dropped every
 * verification email would look fine in the logs while nobody could sign up.
 */
function createEmailSender(): EmailSender {
  if (process.env.RESEND_API_KEY) {
    return new ResendEmailSender();
  }

  // Throws in production. See ConsoleEmailSender.
  return new ConsoleEmailSender();
}

function build(): AuthModule {
  const users = new PgUserRepository();
  const sessions = new PgSessionRepository();
  const authTokens = new PgAuthTokenRepository();

  const hasher = new BcryptPasswordHasher();
  const tokens = new JwtTokenService();
  const email = createEmailSender();

  const links = new VerificationLinkBuilder(resolveBaseUrl());
  const sessionIssuer = new SessionIssuer(sessions, tokens);

  return {
    register: new RegisterUseCase(users, authTokens, hasher, tokens, email, links),
    login: new LoginUseCase(users, hasher, sessionIssuer),
    logout: new LogoutUseCase(sessions, tokens),
    refresh: new RefreshSessionUseCase(sessions, users, tokens),
    verifyEmail: new VerifyEmailUseCase(users, authTokens, tokens),
    resendVerification: new ResendVerificationUseCase(
      users,
      authTokens,
      tokens,
      email,
      links,
    ),
    requestPasswordReset: new RequestPasswordResetUseCase(
      users,
      authTokens,
      tokens,
      email,
      links,
    ),
    resetPassword: new ResetPasswordUseCase(
      users,
      authTokens,
      sessions,
      hasher,
      tokens,
    ),
    getCurrentUser: new GetCurrentUserUseCase(users, sessions, tokens),
    rateLimiter: new PgRateLimiter(),
  };
}

export function getAuthModule(): AuthModule {
  if (!globalForAuth.authModule) {
    globalForAuth.authModule = build();
  }
  return globalForAuth.authModule;
}
