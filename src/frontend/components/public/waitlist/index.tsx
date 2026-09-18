import { WaitlistForm } from "./waitlist-form";

/**
 * The launch call to action.
 *
 * `id="waitlist"` is the anchor every CTA on the site points at, so this is
 * where "Join the waitlist" lands from anywhere — including from the retired
 * /login and /register URLs, which the proxy redirects here.
 */
export function WaitlistSection() {
  return (
    <section id="waitlist" className="relative py-28 lg:py-36 scroll-mt-24">
      <div className="max-w-350 mx-auto px-6 lg:px-12">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-accent/40" />
            Launching soon
          </span>

          <h2 className="text-4xl lg:text-6xl font-display leading-[1.05] tracking-tight mb-6">
            Be first in line
          </h2>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl">
            Jobak is not open yet. Leave your email and we&apos;ll let you know
            the moment it is — early users get in before we open it up more
            widely.
          </p>

          <WaitlistForm source="home" />
        </div>
      </div>
    </section>
  );
}

export { WaitlistForm };
