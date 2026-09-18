"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/frontend/components/ui/button";

/**
 * The waitlist sign-up.
 *
 * ── Why the form is two steps ───────────────────────────────
 * Every field costs signups, and the only one that matters is the address —
 * without it there is nobody to invite. So step one asks for that alone, and
 * the preferences are offered afterwards, once the commitment is already made
 * and the person is looking at a success message rather than a form.
 *
 * Nothing about step two is required. Someone who closes the tab after step one
 * is fully on the list.
 */

const WORK_PREFERENCES = [
  { value: "remote", label: "Remote" },
  { value: "on-site", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
] as const;

const FIELDS = [
  "Software Engineering",
  "Data & AI",
  "Design",
  "Product",
  "Marketing",
  "Sales",
  "Finance",
  "Operations",
  "Other",
];

type Status = "idle" | "submitting" | "joined" | "saved";

export function WaitlistForm({ source }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Step two. Its own pending flag: `status` is already "joined" by then, so it
  // cannot also express "saving" without losing the success state.
  const [field, setField] = useState("");
  const [workPreference, setWorkPreference] = useState<string[]>([]);
  const [savingPrefs, setSavingPrefs] = useState(false);

  async function join(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const response = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }

      setStatus("joined");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong. Please try again.",
      );
      setStatus("idle");
    }
  }

  async function savePreferences() {
    setSavingPrefs(true);

    /*
     * The same endpoint. It upserts on email without overwriting what is
     * already stored, so re-submitting with preferences attached fills them in
     * rather than creating a second row.
     */
    await fetch("/api/v1/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, field, workPreference, source }),
    }).catch(() => {
      // Deliberately ignored: they are already on the list, and telling someone
      // their optional extras failed to save is noise they cannot act on.
    });

    setSavingPrefs(false);
    setStatus("saved");
  }

  if (status === "joined" || status === "saved") {
    return (
      <div className="w-full max-w-xl">
        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-accent/10 border border-accent/25">
          <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">You&apos;re on the list</p>
            <p className="text-sm text-muted-foreground mt-1">
              We&apos;ll email{" "}
              <span className="text-foreground">{email}</span> the moment Jobak
              opens up.
            </p>
          </div>
        </div>

        {status === "joined" && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Optional — tell us what you&apos;re after, so we know which roles
              to have ready first.
            </p>

            <div className="flex flex-wrap gap-2">
              {FIELDS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setField(field === option ? "" : option)}
                  className={`px-3.5 py-2 rounded-full text-sm border transition-colors ${
                    field === option
                      ? "bg-accent/15 border-accent/40 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {WORK_PREFERENCES.map(({ value, label }) => {
                const active = workPreference.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setWorkPreference((current) =>
                        active
                          ? current.filter((v) => v !== value)
                          : [...current, value],
                      )
                    }
                    className={`px-3.5 py-2 rounded-full text-sm border transition-colors ${
                      active
                        ? "bg-accent/15 border-accent/40 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={savePreferences}
                disabled={savingPrefs || (!field && workPreference.length === 0)}
                className="bg-accent hover:bg-accent-bright text-(--bg-canvas) rounded-full"
              >
                Save
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStatus("saved")}
                className="rounded-full text-muted-foreground"
              >
                Skip
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={join} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          aria-label="Email address"
          className="flex-1 px-5 py-3.5 rounded-full bg-white/3 border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent transition-colors"
        />
        <Button
          type="submit"
          disabled={status === "submitting"}
          className="bg-accent hover:bg-accent-bright text-(--bg-canvas) px-7 py-3.5 h-auto rounded-full font-medium group shrink-0"
        >
          {status === "submitting" ? (
            <span className="w-4 h-4 border-2 border-(--bg-canvas)/30 border-t-(--bg-canvas) rounded-full animate-spin" />
          ) : (
            <>
              Join the waitlist
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {/*
        The privacy link belongs here, not only in the footer: this is the
        moment an address is actually handed over, and that is where someone
        deciding whether to hand it over will look.
      */}
      <p className="mt-3 text-xs text-muted-foreground">
        No spam, and no email until we launch. Unsubscribe any time — see our{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
