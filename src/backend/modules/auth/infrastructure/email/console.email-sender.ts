import "server-only";

import type { EmailSender } from "../../domain/ports/email-sender.port";

/**
 * Development mail: prints the link to the server console instead of sending.
 *
 * Lets the whole verification and reset flow be exercised locally with no
 * provider, no API key and no domain to verify. Swapping in a real sender is a
 * one-line change at the composition root; nothing in the use cases moves.
 *
 * Refuses to run in production. A silent no-op there would mean users never
 * receive a link and nothing anywhere reports a problem — a failure that
 * surfaces only as people quietly being unable to sign up.
 */
export class ConsoleEmailSender implements EmailSender {
  constructor() {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ConsoleEmailSender must not be used in production — it prints links " +
          "to the log instead of sending them. Configure a real EmailSender.",
      );
    }
  }

  async sendEmailVerification({
    to,
    link,
  }: {
    to: string;
    fullName: string | null;
    link: string;
  }): Promise<void> {
    this.print("Verify your email", to, link);
  }

  async sendPasswordReset({
    to,
    link,
  }: {
    to: string;
    fullName: string | null;
    link: string;
  }): Promise<void> {
    this.print("Reset your password", to, link);
  }

  /**
   * Boxed and loud because this is meant to be found by eye in a busy dev
   * server log, where a single line among Next's output is easy to scroll past.
   */
  private print(subject: string, to: string, link: string): void {
    console.log(
      [
        "",
        "┌─────────────────────────────────────────────────────────",
        `│ EMAIL (not sent — dev sender)`,
        `│ To:      ${to}`,
        `│ Subject: ${subject}`,
        "│",
        `│ ${link}`,
        "└─────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
  }
}
