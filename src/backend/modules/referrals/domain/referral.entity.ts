/** A friend who joined through someone's link, as the referrer is shown it. */
export interface Referral {
    /**
     * "Omar K." — first name and last initial, or null when the account has no
     * name. Never the email: the referrer knows who they invited, and the list
     * should not hand them anyone's address.
     */
    displayName: string | null;
    joinedAt: Date;
}
