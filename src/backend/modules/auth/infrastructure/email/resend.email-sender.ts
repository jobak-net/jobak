import "server-only";

import type { EmailSender } from "../../domain/ports/email-sender.port";
import { RESET_PASSWORD, VERIFY_EMAIL } from "./templates.generated";

/**
 * Sends auth email through Resend.
 *
 * Calls the REST API with `fetch` rather than taking the `resend` package: the
 * request is a single POST with a JSON body, and the SDK's value here would be
 * types we already have. One fewer dependency to keep current.
 */

const ENDPOINT = "https://api.resend.com/emails";

/**
 * How long to wait before giving up.
 *
 * Every caller treats mail as best-effort and swallows failures, so a hanging
 * request would not break the flow — but it would hold the serverless function
 * open, and registration would feel broken while it did. Ten seconds is
 * generous for a single API call.
 */
const TIMEOUT_MS = 10_000;

interface ResendError {
  name?: string;
  message?: string;
}

export class ResendEmailSender implements EmailSender {
  private readonly apiKey: string;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.AUTH_EMAIL_FROM;

    /*
     * Both checked at construction, which happens once when the auth module is
     * assembled. A missing key discovered at send time would surface as a
     * swallowed error in a log nobody reads, and users would simply never
     * receive a link.
     */
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not set. Create one at https://resend.com/api-keys.",
      );
    }

    if (!from) {
      throw new Error(
        'AUTH_EMAIL_FROM is not set. It must be an address on a domain verified ' +
          'with Resend, e.g. "Jobak <no-reply@jobak.app>".',
      );
    }

    this.apiKey = apiKey;
    this.from = from;
  }

  async sendEmailVerification({
    to,
    link,
  }: {
    to: string;
    fullName: string | null;
    link: string;
  }): Promise<void> {
    await this.send(to, VERIFY_EMAIL.subject, VERIFY_EMAIL.html, link);
  }

  async sendPasswordReset({
    to,
    link,
  }: {
    to: string;
    fullName: string | null;
    link: string;
  }): Promise<void> {
    await this.send(to, RESET_PASSWORD.subject, RESET_PASSWORD.html, link);
  }

  private async send(
    to: string,
    subject: string,
    template: string,
    link: string,
  ): Promise<void> {
    /*
     * `replaceAll` on a fixed marker rather than a template engine. The
     * templates are generated from our own source, so there is no untrusted
     * input here — and the link is a URL we built, not something a user
     * supplied, so there is nothing to escape.
     */
    const html = template.replaceAll("{{link}}", link);

    /*
     * `AbortSignal.timeout` rather than a manual controller: it fires an
     * AbortError that fetch rejects with, which the caller's catch already
     * handles like any other send failure.
     */
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: this.from, to, subject, html }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = (await response
        .json()
        .catch(() => null)) as ResendError | null;

      /*
       * Thrown, not logged-and-swallowed. Every caller already wraps sending in
       * a try/catch precisely so a mail failure cannot fail a registration — so
       * throwing here reaches that handler with the reason intact, rather than
       * silently reporting success for a message that was never sent.
       *
       * The recipient address is deliberately absent from the message: these
       * logs should not become a list of who uses the product.
       */
      throw new Error(
        `Resend rejected the message (${response.status}): ${
          detail?.message ?? detail?.name ?? "no detail"
        }`,
      );
    }
  }
}
