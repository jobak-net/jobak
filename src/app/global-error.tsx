"use client";

import { useEffect } from "react";

/**
 * The last line: shown when the root layout itself fails, which no other
 * `error.tsx` can catch (a boundary sits inside the layout above it).
 *
 * It replaces the whole document, so it gets none of the app: no globals.css,
 * no Tailwind, no fonts, no ClerkProvider, no components that might depend on
 * any of those. Everything here is inline and self-contained on purpose —
 * importing the shared Button or logo would risk failing for the same reason
 * the layout did. The colours are the site's tokens, written out by value.
 *
 * Client component, as all error boundaries must be, so no `metadata` export;
 * the `<title>` is set directly.
 */
const CANVAS = "#08090a";
const TEXT = "#f7f8f8";
const MUTED = "#8a8f98";
const ACCENT = "#58e68c";

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("[app] root layout failed", error);
  }, [error]);

  const digest =
    typeof error === "object" && error !== null && "digest" in error ? String((error as { digest: unknown }).digest) : null;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
          textAlign: "center",
          background: CANVAS,
          color: TEXT,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <title>Something went wrong · Jobak</title>

        {/* The mark, inline: the logo component lives in the app this page cannot rely on. */}
        <svg width="40" height="40" viewBox="0 0 64 64" fill="none" role="img" aria-label="Jobak">
          <path d="M42 12 V38 A10 10 0 0 1 22 38" stroke={ACCENT} strokeWidth="7" strokeLinecap="round" fill="none" />
          <circle cx="25" cy="22" r="5.5" fill={ACCENT} />
        </svg>

        <h1 style={{ margin: "32px 0 0", fontSize: 24, fontWeight: 600, letterSpacing: "-0.03em" }}>
          Something went wrong
        </h1>
        <p style={{ margin: "8px 0 0", maxWidth: 380, fontSize: 14, lineHeight: 1.6, color: MUTED }}>
          Jobak didn&apos;t load properly. It&apos;s usually temporary, so try again in a moment.
        </p>

        <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              height: 40,
              padding: "0 20px",
              border: "none",
              borderRadius: 10,
              background: ACCENT,
              color: "#06210f",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {/* A plain link, not next/link: with the root layout broken, a full page load is the safer way back. */}
          <a
            href="/"
            style={{
              height: 40,
              padding: "0 20px",
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 10,
              color: TEXT,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Go to homepage
          </a>
        </div>

        {digest && (
          <p style={{ margin: "32px 0 0", fontFamily: "ui-monospace, monospace", fontSize: 12, color: MUTED }}>
            Reference: {digest}
          </p>
        )}
      </body>
    </html>
  );
}
