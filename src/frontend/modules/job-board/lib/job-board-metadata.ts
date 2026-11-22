import type { Metadata } from "next";

import { isProductionSite } from "@/frontend/shared/config";
import { categoryLabel } from "@/shared/job-categories";

import { WORKPLACES, hrefFor, readCategory, readPage, readRegion, readWorkplace, type BoardSearchParams } from "./board-url";

/** The board's title, description and indexing for one combination of filters. */
export function jobBoardMetadata(params: BoardSearchParams): Metadata {
  const region = readRegion(params.region);
  const workplace = readWorkplace(params.workplace);
  const category = readCategory(params.category);
  const categoryName = categoryLabel(category);
  const page = readPage(params.page);

  const scope =
    region === "mena" ? "in MENA" : region === "remote" ? "remote worldwide" : "worldwide";
  const kind = workplace === "all" ? "" : `${WORKPLACES.find((w) => w.value === workplace)?.label} `;

  // "Latest Remote Engineering jobs in MENA" — the category reads better before
  // the workplace, since it is the more specific of the two.
  const title = categoryName
    ? `Latest ${kind}${categoryName} jobs ${scope}`
    : `Latest ${kind}jobs ${scope}`;
  const description =
    `New ${kind.toLowerCase()}openings ${scope}, collected from Wuzzuf, Bayt, Talent.com, LinkedIn, ` +
    "remote job boards and companies' own career pages. Free to browse, no account needed.";

  /*
   * Every filtered view points its canonical at the unfiltered page. They are
   * the same listings in a different order, and letting each combination be
   * indexed separately is how a job board earns a duplicate-content penalty.
   */
  const filtered =
    region !== "mena" ||
    workplace !== "all" ||
    category !== "all" ||
    page > 1 ||
    Boolean(params.q);

  return {
    title: page > 1 ? `${title} — page ${page} — Jobak` : `${title} — Jobak`,
    description,
    keywords: [
      "jobs in Egypt", "jobs in Saudi Arabia", "jobs in UAE", "MENA jobs",
      "remote jobs MENA", "وظائف", "وظائف مصر", "وظائف عن بعد",
    ],
    alternates: { canonical: "/jobs" },
    openGraph: {
      type: "website",
      title,
      description,
      url: hrefFor({ region, workplace, category, q: params.q, page }),
      siteName: "Jobak",
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title, description },
    robots: isProductionSite
      ? { index: !filtered, follow: true }
      : { index: false, follow: false },
  };
}
