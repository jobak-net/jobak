/**
 * Outbound mail for the auth flows.
 *
 * A port rather than a direct provider call so the use cases stay free of
 * whichever service is sending: register and forgot-password describe *what*
 * should be sent, and the composition root decides *how*.
 *
 * Deliberately narrow. Only the two messages auth actually needs, with the link
 * already built — an interface that took a template name and a bag of
 * variables would push the decision of what a verification email says back into
 * the use cases, which is not theirs to make.
 */
export interface EmailSender {
  /**
   * The link is absolute and single-use; the recipient clicks it to confirm the
   * address. Implementations must not log it in production — it is a
   * credential for the duration of its life.
   */
  sendEmailVerification(input: {
    to: string;
    fullName: string | null;
    link: string;
  }): Promise<void>;

  sendPasswordReset(input: {
    to: string;
    fullName: string | null;
    link: string;
  }): Promise<void>;
}
