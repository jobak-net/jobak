/** Someone the user referred, as the page lists them. */
export interface ReferralRow {
  displayName: string | null;
  /** "7 Nov 2026". */
  joined: string;
}

/** The user's invite link and who joined through it (`null`: couldn't read the list). */
export interface ReferralInviteView {
  link: string;
  referrals: ReferralRow[] | null;
}
