import type { AccountStatus } from "@/shared/contracts/account";

import type { AccountSources } from "../domain/ports";

/**
 * Who the viewer is and whether they've finished onboarding — the facts pages
 * need to decide where someone belongs. Deciding (redirecting, showing a
 * retry screen) is the frontend's job, not this one's.
 *
 * Three outcomes, kept apart on purpose:
 *  - an `AccountStatus`: signed in;
 *  - `null`: nobody is signed in;
 *  - a thrown error: couldn't tell. Never folded into `null`, which would read
 *    as "signed out" and send a signed-in user to sign in.
 *
 * Returns only what pages show or decide on — not the user's id.
 */
export class GetAccountStatusUseCase {
  constructor(private readonly sources: AccountSources) {}

  async execute(): Promise<AccountStatus | null> {
    const user = await this.sources.currentUser();
    if (!user) return null;

    const onboarded = await this.sources.hasCompletedOnboarding(user.id);
    return { user: { fullName: user.fullName, email: user.email }, onboarded };
  }
}
