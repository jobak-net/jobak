import "server-only";

import { JoinWaitlistUseCase } from "./application/use-cases/join-waitlist.use-case";
import type { WaitlistRepository } from "./domain/ports/waitlist.repository";
import { PgWaitlistRepository } from "./infrastructure/repositories/waitlist.repository";

/**
 * The waitlist module's composition root. Same pattern as the auth module:
 * one place decides the implementations, cached per process.
 */

const globalForWaitlist = globalThis as unknown as {
  waitlistModule?: WaitlistModule;
};

export interface WaitlistModule {
  join: JoinWaitlistUseCase;
  repository: WaitlistRepository;
}

export function getWaitlistModule(): WaitlistModule {
  if (!globalForWaitlist.waitlistModule) {
    const repository = new PgWaitlistRepository();
    globalForWaitlist.waitlistModule = {
      join: new JoinWaitlistUseCase(repository),
      repository,
    };
  }
  return globalForWaitlist.waitlistModule;
}
