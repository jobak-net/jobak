"use client";

import { memo, type CSSProperties, type ReactNode } from "react";
import { Globe2, Search } from "lucide-react";

import type { JobPreferences } from "@/backend/modules/preferences/domain/job-preferences";
import {
  validateForCompletion,
  type StepId,
} from "@/backend/modules/preferences/domain/onboarding";
import { Flag } from "@/frontend/components/shared/flag";
import { countryName } from "@/frontend/lib/configs/countries";
import { cn } from "@/frontend/lib/utils/utils";

import { JOB_TYPE_LABEL, SENIORITY_LABEL, WORK_MODE_LABEL } from "./labels";

/**
 * The right-hand panel of onboarding: the search Jobak will run, filling in as
 * the answers come.
 *
 * Purely a reflection of the draft — it reads nothing and changes nothing, so
 * it is hidden from assistive tech (the review step reads the same answers out
 * properly). The row for the current step is lit, picks pop in as they are
 * made, and the chosen countries settle onto the orbit rings behind the card.
 */

const HEADLINES: Record<StepId, { title: string; body: string }> = {
  location: {
    title: "Jobs across MENA, or remote from anywhere.",
    body: "Jobak searches the countries you pick. Anywhere in the world means remote roles only.",
  },
  workMode: {
    title: "Remote, hybrid or on-site.",
    body: "Pick more than one and every one of them stays in the search.",
  },
  titles: {
    title: "The roles you'd apply for.",
    body: "Titles find the postings. Keywords pick out the ones that fit you.",
  },
  details: {
    title: "Fine-tune, if you like.",
    body: "Leave these empty and nothing is filtered out.",
  },
  review: {
    title: "Ready when you are.",
    body: "Jobak starts searching as soon as you confirm. Change any of it later in Preferences.",
  },
};

/** Ring radii in px, inside a 640px square centred behind the card. */
const RINGS = [150, 225, 300];
/** The golden angle spreads any number of flags evenly without clustering. */
const GOLDEN_ANGLE = 137.508;
const MAX_ORBIT_FLAGS = 9;

export function SearchPreview({
  draft,
  stepId,
}: {
  draft: JobPreferences;
  stepId: StepId;
}) {
  const headline = HEADLINES[stepId];
  const { worldwide, countries } = draft.location;
  const ready = validateForCompletion(draft) === null;

  const locationChips = worldwide
    ? [
        <PreviewChip key="worldwide" icon={<Globe2 className="size-3.5" />}>
          Anywhere · remote
        </PreviewChip>,
      ]
    : countries.map((code) => (
        <PreviewChip
          key={code}
          icon={<Flag code={code} className="h-2.5 w-3.75 rounded-[2px]" />}
        >
          {countryName(code)}
        </PreviewChip>
      ));

  const modes = worldwide
    ? ["Remote only"]
    : draft.workModes.map((mode) => WORK_MODE_LABEL[mode]);
  const details = [
    ...draft.jobTypes.map((type) => JOB_TYPE_LABEL[type]),
    ...(draft.seniority ? [SENIORITY_LABEL[draft.seniority]] : []),
  ];

  return (
    <div
      aria-hidden="true"
      className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(120%_80%_at_50%_0%,oklch(0.82_0.2_145/0.14),transparent_60%),linear-gradient(180deg,#111314,#0b0c0d)]"
    >
      {/* A soft accent field. A gradient, not a blur filter: blurs are repainted every frame something moves near them. */}
      <div className="pointer-events-none absolute -right-40 top-1/4 size-150 bg-[radial-gradient(closest-side,oklch(0.82_0.2_145/0.1),transparent)]" />

      <FloatingDots />

      <header className="relative z-10 px-10 pt-14 text-center xl:px-16">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-medium text-[#0b0c0d]">
          <Search className="size-3" strokeWidth={2.5} /> Your Jobak search
        </span>
        <div key={stepId}>
          <h2 className="ob-headline mx-auto mt-5 max-w-[22ch] text-[30px] font-semibold leading-[1.1] tracking-[-0.035em] text-fg-primary xl:text-[34px]">
            {headline.title}
          </h2>
          <p
            className="ob-headline mx-auto mt-3 max-w-[44ch] text-sm leading-relaxed text-fg-tertiary"
            style={{ "--ob-delay": "90ms" } as CSSProperties}
          >
            {headline.body}
          </p>
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center px-10 pb-10 pt-6">
        <Orbits countries={worldwide ? [] : countries} worldwide={worldwide} />

        <div
          className="ob-float relative z-10 w-full max-w-md"
          style={{ "--ob-float": "9s" } as CSSProperties}
        >
          <div className="rounded-[22px] border border-white/10 bg-[#121415]/95 p-5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.02)_inset] [transform:perspective(1400px)_rotateX(5deg)_rotateY(-7deg)]">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[13px] font-medium text-fg-secondary">
                Search filters
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors duration-500",
                  ready
                    ? "bg-accent/12 text-accent-text"
                    : "bg-white/5 text-fg-quaternary",
                )}
              >
                <span className="relative flex size-1.5">
                  {ready && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-accent" />
                  )}
                  <span
                    className={cn(
                      "relative size-1.5 rounded-full",
                      ready ? "bg-accent" : "bg-white/25",
                    )}
                  />
                </span>
                {ready ? "Ready to search" : "In progress"}
              </span>
            </div>

            <div className="space-y-1.5">
              <PreviewRow
                label="Location"
                active={stepId === "location"}
                empty="Pick a country"
              >
                {locationChips}
              </PreviewRow>
              <PreviewRow
                label="Work mode"
                active={
                  stepId === "workMode" || (worldwide && stepId === "location")
                }
                empty="Remote, hybrid, on-site"
              >
                {modes.map((mode) => (
                  <PreviewChip key={mode}>{mode}</PreviewChip>
                ))}
              </PreviewRow>
              <PreviewRow
                label="Titles"
                active={stepId === "titles"}
                empty="Add a job title"
              >
                {draft.jobTitles.map((title) => (
                  <PreviewChip key={title} accent>
                    {title}
                  </PreviewChip>
                ))}
              </PreviewRow>
              <PreviewRow
                label="Keywords"
                active={stepId === "titles"}
                empty="Optional"
              >
                {draft.keywords.map((keyword) => (
                  <PreviewChip key={keyword}>{keyword}</PreviewChip>
                ))}
              </PreviewRow>
              <PreviewRow
                label="Details"
                active={stepId === "details"}
                empty="Any type · any level"
              >
                {details.map((detail) => (
                  <PreviewChip key={detail}>{detail}</PreviewChip>
                ))}
              </PreviewRow>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  active,
  empty,
  children,
}: {
  label: string;
  active: boolean;
  empty: string;
  children: ReactNode[];
}) {
  const shown = children.slice(0, 4);
  const more = children.length - shown.length;

  return (
    <div
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-[12px] border px-3 py-2 transition-[background-color,border-color,box-shadow] duration-500",
        active
          ? "border-accent/35 bg-accent/6 shadow-[0_0_24px_-8px_oklch(0.82_0.2_145/0.5)]"
          : "border-transparent bg-white/2.5",
      )}
    >
      <span
        className={cn(
          "w-17 shrink-0 text-[11px] font-medium uppercase tracking-[0.06em] transition-colors duration-500",
          active ? "text-accent-text" : "text-fg-quaternary",
        )}
      >
        {label}
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {children.length === 0 ? (
          <span className="text-[12px] text-fg-quaternary">{empty}</span>
        ) : (
          <>
            {shown}
            {more > 0 && (
              <span
                key={`more-${more}`}
                className="ob-pop text-[11px] text-fg-tertiary"
              >
                +{more}
              </span>
            )}
          </>
        )}
      </span>
    </div>
  );
}

function PreviewChip({
  children,
  icon,
  accent,
}: {
  children: ReactNode;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "ob-pop inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2 py-0.5 text-[11.5px]",
        accent
          ? "bg-accent/14 text-accent-text"
          : "bg-white/7 text-fg-secondary",
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

/**
 * Dotted rings that turn slowly behind the card. Each chosen country lands on
 * a ring as a round flag; worldwide puts a globe there instead.
 */
const Orbits = memo(
  function Orbits({
    countries,
    worldwide,
  }: {
    countries: string[];
    worldwide: boolean;
  }) {
    const nodes = worldwide ? ["__globe"] : countries.slice(0, MAX_ORBIT_FLAGS);

    return (
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-160 -translate-x-1/2 -translate-y-1/2">
        {RINGS.map((radius) => (
          <span
            key={radius}
            className="absolute left-1/2 top-1/2 rounded-full border border-dashed border-white/7"
            style={{
              width: radius * 2,
              height: radius * 2,
              marginLeft: -radius,
              marginTop: -radius,
            }}
          />
        ))}

        <div
          className="ob-orbit absolute inset-0"
          style={{ "--ob-orbit": "120s" } as CSSProperties}
        >
          {nodes.map((code, i) => {
            const radius = RINGS[(i + 1) % RINGS.length];
            const angle = ((i * GOLDEN_ANGLE - 90) * Math.PI) / 180;
            return (
              <span
                key={code}
                className="absolute"
                style={{
                  left: `calc(50% + ${Math.cos(angle) * radius}px)`,
                  top: `calc(50% + ${Math.sin(angle) * radius}px)`,
                }}
              >
                <span
                  className="ob-orbit-rev -ml-5 -mt-5 block"
                  style={{ "--ob-orbit": "120s" } as CSSProperties}
                >
                  <span className="ob-pop flex size-10 items-center justify-center overflow-hidden rounded-full bg-[#16191a] shadow-[0_8px_24px_-6px_rgba(0,0,0,0.7)] ring-1 ring-white/12">
                    {code === "__globe" ? (
                      <Globe2 className="size-5 text-accent" />
                    ) : (
                      <Flag
                        code={code}
                        className="size-full scale-[1.6] object-cover"
                      />
                    )}
                  </span>
                </span>
              </span>
            );
          })}
        </div>
      </div>
    );
  },
  // The draft is rebuilt on every change, so compare the picks, not the array.
  (a, b) =>
    a.worldwide === b.worldwide && a.countries.join() === b.countries.join(),
);

/** A handful of slow-floating specks, like dust in the panel's light. */
const DOTS: {
  left: string;
  top: string;
  size: number;
  delay: number;
  duration: number;
  tone: string;
}[] = [
  {
    left: "14%",
    top: "22%",
    size: 6,
    delay: 0,
    duration: 8,
    tone: "bg-accent",
  },
  {
    left: "84%",
    top: "16%",
    size: 5,
    delay: 1200,
    duration: 9,
    tone: "bg-white/50",
  },
  {
    left: "8%",
    top: "68%",
    size: 4,
    delay: 600,
    duration: 7,
    tone: "bg-white/35",
  },
  {
    left: "90%",
    top: "58%",
    size: 6,
    delay: 1800,
    duration: 10,
    tone: "bg-accent/70",
  },
  {
    left: "62%",
    top: "88%",
    size: 4,
    delay: 900,
    duration: 8,
    tone: "bg-white/40",
  },
  {
    left: "30%",
    top: "92%",
    size: 5,
    delay: 2400,
    duration: 9,
    tone: "bg-accent/60",
  },
];

const FloatingDots = memo(function FloatingDots() {
  return (
    <>
      {DOTS.map((dot, i) => (
        <span
          key={i}
          className={cn(
            "ob-float pointer-events-none absolute rounded-full",
            dot.tone,
          )}
          style={
            {
              left: dot.left,
              top: dot.top,
              width: dot.size,
              height: dot.size,
              "--ob-delay": `${dot.delay}ms`,
              "--ob-float": `${dot.duration}s`,
            } as CSSProperties
          }
        />
      ))}
    </>
  );
});
