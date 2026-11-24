# Apify marketplace: design

Status: approved 2026-11-24 (browser-only, token in the browser, rule
exception below; catalogue approved after a full store sweep). Built the same
day: see "Changes during the build" in the catalogue section, and
[docs/features/JOB_COLLECTION.md](../../features/JOB_COLLECTION.md).

## Intent

A dashboard page where a user finds jobs on other sites (LinkedIn, Indeed,
Glassdoor, Wuzzuf, Bayt, Naukrigulf, Google Jobs, company career sites) by
running Apify actors on **their own Apify account**. The page is locked
until they add their Apify token, which is optional and lives in Settings.

The user's requirement: everything happens in the user's browser. Jobak's
server does no scraping work, stores no token, and sees no results.

## Goals

- A catalogue of curated job actors, one card per site, with what it
  covers and what it costs on the user's Apify plan.
- One search (job title, location, how many jobs) run on one or more sites
  at once, straight from the browser to Apify.
- Live progress per site, a Stop button, then one merged list of jobs, each
  linking to the original listing.
- The cost known before running, and capped by Apify itself.
- The token added, checked and removed in Settings, kept only in the
  browser.

## Non-goals

- Saving results to Jobak: Saved jobs, Job matches and the shared job pool
  stay as they are. Results stay on the device.
- Scheduled or background collection.
- Any Jobak API route, table or migration for this feature.
- The old Apify leftovers: `user_preferences.apify_key_encrypted`,
  `apify_actors` (migration 008), and the unused `apifyKey` and
  `apifyActors` in the onboarding types. These stay untouched; removing
  them is a separate clean-up.
- Letting users add any actor from the store. The catalogue is curated in
  code.

## Anti-goals (a failure even if it works)

- The token reaches Jobak's server in any form: request, log, error report.
- A run spends more than the user agreed to before pressing Run.
- A run keeps spending after the user pressed Stop.

## Constraints and facts checked (2026-11-24)

- **Browser calls work.** `api.apify.com` answers CORS preflights with
  `Access-Control-Allow-Origin: *`, allows the `Authorization` header and
  `GET`/`POST`. The token goes in `Authorization: Bearer …`, never in a URL.
- **No CSP** is set by the app (`next.config.ts`, proxy), so no
  `connect-src` change is needed.
- **Costs.** Almost every job actor is pay-per-result (about $0.0001 to
  $0.012 per job on the free plan) and some add a small start fee. Apify
  caps a run with the `maxItems` and `maxTotalChargeUsd` run options.
- **Project rules.** Browser fetching goes through TanStack Query (rule in
  AGENTS.md). The rule "never call `fetch` directly, only `clientFetch`" is
  written for Jobak's own API; this feature calls a third party with the
  user's key. See "Rule exception" below.

## Approaches considered

1. **Browser only, token kept in the browser (chosen by the user).** The
   page calls Apify directly; the token lives in `localStorage`. No server
   load and nothing stored by Jobak. Costs: per device, and readable by any
   script running on Jobak's pages.
2. **Token encrypted on Jobak's server, handed to the browser when the page
   opens.** Works on every device, but the server stores and decrypts it on
   every visit, and it breaks the rule that a saved key never leaves the
   server. Rejected.
3. **Server runs the actors** (the earlier "run from the page" option with a
   server in the middle). Rejected by the user: they want no server
   pressure.

## The design

### Where things live

All frontend, a new module `src/frontend/modules/job-collection/`:

- `config/actors.ts`: the catalogue. One entry per site:
  - `id` (our key, e.g. `linkedin`), `site`, `actorId` (`user/name`);
  - `description`, `regions` (e.g. "Egypt & MENA");
  - `buildInput({ title, location, maxItems })` turns our search into that
    actor's input;
  - `readJob(item)` turns one dataset item into a `CollectedJob`.
- `lib/apify-client.ts`: the only file that talks to Apify. Plain functions
  `verifyToken`, `actorPricing`, `startRun`, `getRun`, `abortRun`,
  `datasetItems`. Each takes the token as an argument and calls only
  `https://api.apify.com/v2/…`.
- `lib/token-store.ts`: reads, writes and removes the token in
  `localStorage`, keyed per signed-in account
  (`jobak.apify-token.<userId>`), so two accounts on one browser don't
  share a token. Every access is wrapped in try/catch, and a missing or
  failed read means "no token".
- `lib/results.ts`: merges jobs from several sites, dedupes by URL (else
  title + company), sorts newest first, and builds the CSV.
- `lib/history.ts`: the last 5 searches on this device (search, sites, run
  ids, when). The results themselves are not stored; reopening an entry
  fetches its datasets again from Apify. On the free plan Apify keeps the 10
  most recent runs for 4 months, and older unnamed runs go after the
  retention period, so an entry whose data is gone says so and offers to
  run the search again.
- `hooks/use-apify-token.ts`, `hooks/use-collection.ts` (search state, runs,
  polling, merge).
- `components/`: `actor-card`, `search-form`, `run-progress`,
  `results-table`, `history-list`, `apify-gate` (the lock).
- `views/job-collection-view.tsx`; `index.ts` exports the view and what
  Settings needs (`ApifyTokenPanel`).
- Page: `src/app/(protected)/dashboard/job-collection/page.tsx`, metadata
  plus the view. The only Jobak data it needs is:
  - the account id for the token key, from `requireDashboardUser()`
    (dashboard/server, already cached for the request by the dashboard
    guard);
  - the preferred country, from `serverFetch("/api/v1/preferences")` in a
    small loader (`api/job-collection.loader.ts`, blank on failure).

  Settings passes the same account id to `ApifyTokenPanel`.
- Nav: "Find jobs elsewhere" in the Workspace group.

### `CollectedJob`

```ts
interface CollectedJob {
  site: string;          // catalogue id
  title: string;
  company: string | null;
  location: string | null;
  url: string;           // the original listing; an item without one is dropped
  postedAt: string | null;
  salary: string | null;
}
```

`readJob` reads several likely field names per value (`jobUrl`/`url`/
`link`, …), because actor output is not a versioned contract. Items with no
title or URL are dropped, and the run says how many were dropped.

### The catalogue

How it was built (2026-11-24): Apify's `JOBS` store category (89 actors,
many of them sales-lead tools rather than job boards), then a search per
platform across about 90 job sites. These were the ones considered: global
boards, MENA and Gulf, South Asia, Southeast Asia, Europe, Latin America,
remote and startup boards, freelancing, company career-site systems (ATS),
and company reviews. Input schemas were read through the Apify MCP. The raw
sweep is kept outside the repo.

**An actor is in the catalogue only if:**
- it searches by job title or keyword plus a country or location;
- at least 20 people used it in the last 30 days, and it isn't deprecated;
- it costs at most about $0.006 per job on the free plan;
- it never starts other actors (their runs are billed outside our cap);
- its main purpose isn't collecting people's emails or phone numbers.

**Each entry's `buildInput` also turns off** everything that isn't a
one-off search:
- notifications (Telegram, Slack, Discord, WhatsApp), webhooks and app
  connectors;
- incremental mode, contact extraction and browser fallbacks;
- options that need another service's key.

It also sets the actor's own result cap to the user's "jobs per site".
`readJob` ignores contact fields even when an actor returns them.

**The search form needs a country.** Many actors take a market code, not
free text: Wuzzuf takes `EG`/`SA`/`AE`…, Bayt 13 market codes. So the form
is: job title, country (picked from `@/shared/countries`), city (optional),
and jobs per site. Each entry declares the countries it covers (a list, or
"any"), and `buildInput` maps our ISO code to that actor's own value.

Categories as the page shows them, in this order, with the starting pick
per site (30-day users, free-plan price per job, plus a start fee where
there is one):

**Egypt & the Middle East**
| Site | Actor | 30-day users | Price |
|---|---|---|---|
| Wuzzuf | `blackfalcondata/wuzzuf-scraper` | 30 | $0.001 + $0.005 start |
| Bayt | `blackfalcondata/bayt-scraper` | 274 | $0.001 to $0.002 |
| Naukrigulf | `blackfalcondata/naukrigulf-scraper` | 295 | $0.001 + $0.005 start |
| GulfTalent | `blackfalcondata/gulftalent-scraper` | 130 | $0.0007 + $0.005 start |

Left out:
- `get_anything/gcc-jobs-aggregator` starts a second, separately billed
  unblocker run;
- Forasna, Tanqeeb and Akhtaboot have 1 to 13 users a month, too few to
  trust;
- Dubizzle is mostly property listings;
- Mostaql's only actor (4 users) watches projects rather than searching
  them. Revisit it later.

**Worldwide job boards**
| Site | Actor | 30-day users | Price |
|---|---|---|---|
| LinkedIn | `curious_coder/linkedin-jobs-scraper` | 13,150 | $0.002 |
| Indeed | `valig/indeed-jobs-scraper` | 6,298 | $0.0001 + $0.001 start |
| Glassdoor | `valig/glassdoor-jobs-scraper` | 1,252 | $0.0004 + $0.001 start |
| Google Jobs | `orgupdate/google-jobs-scraper` (swapped in, see below) | 100 | $0.005 + $0.02 start, whole pages of 10 |
| ZipRecruiter (US, Canada) | `silentflow/ziprecruiter-scraper-ppe` | 170 | $0.001 |

**Remote work and startups**
| Site | Actor | 30-day users | Price |
|---|---|---|---|
| Wellfound | `blackfalcondata/wellfound-scraper` | 457 | $0.003 + $0.005 start |
| Welcome to the Jungle | `clearpath/welcome-to-the-jungle-jobs-api` | 223 | under $0.0001 |
| Himalayas | `inlifeprojects/himalayas-jobs-scraper` | 191 | $0.001 |
| Y Combinator startups | `nomad-agent/ycombinator-was-scraper` | 159 | $0.0001 |
| Remote OK | `inlifeprojects/remoteok-jobs-scraper` | 41 | $0.001 |
| We Work Remotely | `inlifeprojects/weworkremotely-jobs-scraper` | 22 | $0.001 |

**Freelance projects**
| Site | Actor | 30-day users | Price |
|---|---|---|---|
| Upwork | `blackfalcondata/upwork-scraper` | 735 | $0.001 + $0.001 start |
| Freelancer.com | `shahidirfan/freelancer-com-scraper` | 27 | $0.001 |
| PeoplePerHour | `memo23/peopleperhour-job-scraper` | 24 | $0.001 + $0.005 start |

**Company career sites**
| Site | Actor | 30-day users | Price |
|---|---|---|---|
| 200+ career-site systems (Greenhouse, Lever, Workday…) | `jobo.world/ats-jobs-api` | 230 | $0.004 |

`fantastic-jobs/career-site-job-listing-api` is more used (1,613) but costs
$0.012 + $0.01 start, over the price rule.

**South Asia**
| Site | Actor | 30-day users | Price |
|---|---|---|---|
| Naukri | `valig/naukri-jobs-scraper` | 2,856 | $0.0004 + $0.001 start |
| Internshala (internships) | `blackfalcondata/internshala-scraper` | 206 | $0.0004 |
| Rozee.pk | `memo23/rozee-scraper` | 34 | $0.001 + $0.005 start |

**Southeast Asia and the Pacific**
| Site | Actor | 30-day users | Price |
|---|---|---|---|
| Seek (Australia, NZ) | `websift/seek-job-scraper` | 288 | $0.003 |
| JobStreet | `blackfalcondata/jobstreet-scraper` | 99 | $0.002 + $0.01 start |
| JobsDB | `blackfalcondata/jobsdb-scraper` | 41 | $0.001 + $0.01 start |
| MyCareersFuture (Singapore) | `automation-lab/mycareersfuture-singapore-jobs-scraper` | 20 | tiny + $0.005 start |

**Europe**
| Site | Actor | 30-day users | Price |
|---|---|---|---|
| StepStone | `valig/stepstone-jobs-scraper` | 345 | $0.0004 + $0.001 start |
| XING | `shahidirfan/Xing-Jobs-Scraper` | 219 | $0.001 |
| Arbeitsagentur (Germany) | `blackfalcondata/arbeitsagentur-jobs-feed` | 102 | $0.0008 |
| France Travail | `dltik/francetravail-scraper` | 69 | $0.003 |
| jobs.ch (Switzerland) | `santamaria-automations/jobs-ch-scraper` | 64 | $0.003 + $0.001 start |
| Pracuj (Poland) | `blackfalcondata/pracuj-scraper` | 62 | $0.002 + $0.01 start |
| Totaljobs (UK) | `valig/totaljobs-jobs-scraper` | 51 | $0.0004 + $0.001 start |
| CV-Library (UK) | `blackfalcondata/cv-library-scraper` | 42 | $0.0015 + $0.005 start |
| Jobindex (Denmark) | `blackfalcondata/jobindex-scraper` | 30 | $0.002 + $0.01 start |
| karriere.at (Austria) | `blackfalcondata/karriere-at-scraper` | 28 | $0.0015 |

**Latin America**
| Site | Actor | 30-day users | Price |
|---|---|---|---|
| Computrabajo | `santamaria-automations/computrabajo-scraper` | 74 | $0.003 + $0.001 start |
| Bumeran | `blackfalcondata/bumeran-scraper` | 44 | $0.001 + $0.0005 start |
| OCC Mundial (Mexico) | `corvuslab/occ-mundial-jobs-scraper` | 22 | $0.001 + $0.0005 start |

That's 39 sites (43 planned; see "Changes during the build"). Left out for too few users (under 20 a month): Catho,
EURES, InfoJobs, SimplyHired, Jooble, Talent.com, CareerBuilder, Job Bank
Canada, Workopolis, Kalibrr, Taiwan 104, JobKorea and Wantedly. Dice,
Remotive, Otta, Built In, Toptal and Lever have no actor that does a
search.

**Changes during the build (2026-11-24), from reading each schema and one live run per actor:**
- `epctex/google-jobs-scraper` was broken (its browser crashes at launch, whatever the input). It was swapped for `orgupdate/google-jobs-scraper`, which counts pages (10 jobs each), so entries gained an optional `pageSize` and estimates round up to whole pages.
- Workday, Greenhouse and Ashby (`fantastic-jobs`) were dropped. Their input demands at least 200 results per run, and `jobo.world/ats-jobs-api` already covers 200+ hiring systems, those three included.
- Foundit was dropped. It refuses runs whose cost cap is under $0.50, which conflicts with capping each run at its estimate plus 10%. India still has Naukri and Internshala.
- Welcome to the Jungle covers its own markets only (FR, ES, GB, US, BE, DE, NL, CH, LU, CZ, SK). A search for Egypt returned nothing.
- ZipRecruiter finds nothing without a location, so the country name stands in for a missing city.
- The free plan allows 5 runs at once. More fail with 402 `concurrent-runs-limit-exceeded`, so the page queues sites, reads the limit from `GET /v2/users/me/limits` (`maxConcurrentActorJobs`), and treats that error as "busy, retry".
- Many pay-per-event actors keep charging past `maxItems` until `maxTotalChargeUsd`. So the dollar cap (estimate plus 10%) is the real limit, as designed.
- Apify's run object has no `stats.itemCount`. The page always reads the dataset when a run ends, and shows progress from `chargedEventCounts` where an actor reports it.
- Retention: the free plan keeps the 10 most recent runs for 4 months, not 7 days (the history copy says the results may be gone).

**Company research (reviews and salaries)** takes a company name, not a
job search. Candidates: `kaix/glassdoor-reviews-scraper` (124/mo),
`memo23/apify-indeed-reviews-ppr` (68/mo) and
`maximedupre/ambitionbox-reviews-scraper` (22/mo). It's a different form
and result shape, so it's **not in this version**. It's a natural second
tab later.

**Before each actor goes in**, the builder reads its input schema through
the Apify MCP (`fetch-actor-details`, `inputSchema` only) and, when one
exists, its inferred output schema. It writes `buildInput`/`readJob` from
them, plus a saved sample item for the `readJob` test. An actor that fails
the rules above on a closer look is swapped for the next most-used one for
that site, or dropped and listed in the doc.

**Live prices.** The price on each card is read in the browser from the
public store API (`GET /v2/store?search=<actorId>`, no token), with the
table's figure as the fallback.

**On the page:**
- Sites are grouped by these categories.
- The ones that cover the chosen country come first, marked "Covers
  Egypt"; the rest fold under "Other regions".
- The country starts as the one in the user's job preferences (one
  `serverFetch` of `/api/v1/preferences` in the page loader), else blank.
- First visit preselects LinkedIn, Indeed and the regional boards for that
  country. After that, the last selection is remembered on the device.
- A filter box narrows the 43 cards by name.

### Settings: the token

A new Settings tab, **"Job collection"**, after "AI provider":

- Explains in one line what the token is for, that it stays in this browser
  only, and that runs spend their Apify credit.
- A link to create a token on Apify (console › Settings › API &
  Integrations), suggesting a token limited to running actors.
- Paste, then **Check and save**:
  - `GET /v2/users/me` with the token;
  - on success: saved, and the tab shows "Connected as {username}, {plan}";
  - on 401: "Apify didn't accept this token", nothing saved.
- The shape check runs first: the existing `checkKeyFormat("apify", …)`
  (`apify_api_` prefix).
- **Remove**: deletes it from this browser.
- No Jobak request is made at any point.

### The page

```
Find jobs elsewhere                                     Credit left: $4.12
Runs Apify actors on your own Apify account, from your browser.

[ Job title: Back End Developer ] [ Country: Egypt v ] [ City: Cairo ] [ Jobs per site: 25 v ]

Sites  [ filter… ]                                     (pick one or more)
Egypt & the Middle East        Covers Egypt
  [x] Wuzzuf        $0.001/job      [x] Bayt        $0.002/job
Worldwide job boards           Covers Egypt
  [x] LinkedIn      $0.002/job      [x] Indeed      $0.0001/job
  [ ] Glassdoor     $0.0004/job     [ ] Google Jobs $0.0045/job
Remote work and startups · Freelance projects · Company career sites
  …
Other regions (South Asia, Europe, …)                          [ show ]
                                  Up to about $0.08 ·  [ Run search ]

Running:  LinkedIn  ███████░░ 18 jobs     Wuzzuf  done, 25 jobs     [ Stop ]

43 jobs                                            [ Download CSV ]
Back End Developer · Khazna · Cairo · 2 days ago · Wuzzuf        Open ↗
...
Recent searches on this device
```

- **Locked** (no token on this device): `LockedFeature` over the page with
  "To unlock job collection, add your Apify token" and a button to Settings'
  "Job collection" tab. The token is read on the client after mount; until
  then a neutral skeleton shows, so a user with a token never sees the lock
  flash.
- **Credit left**: `GET /v2/users/me/limits` (monthly usage against limit),
  shown in the header. If it fails, the header hides it.
- **Estimate**: the sum over picked sites of `start fee + maxItems × price
  per job`. Shown before Run.
- **Jobs per site**: 10, 25 (default), 50 or 100.
- **Run**: for each picked site, in parallel:
  `POST /v2/acts/{actorId}/runs?maxItems={n}&maxTotalChargeUsd={cap}`, with
  `buildInput(...)` as the body. `cap` is that site's own estimate plus 10%.
  `maxItems` also limits pay-per-result actors, so the user is never charged
  for more jobs than they picked.
- **Progress**: `GET /v2/actor-runs/{id}?waitForFinish=30` in a TanStack
  query loop (long poll, so about one request per 30 s per site). It shows
  the status and the item count from the run's stats.
- **Stop**: `POST /v2/actor-runs/{id}/abort` for every run still going.
  Whatever was collected so far is fetched and shown.
- **Results**: `GET /v2/datasets/{datasetId}/items?clean=true&limit={n}` per
  finished run. Then `readJob`, merge and dedupe, one list with the site
  shown on each row. There is a CSV download, and each row's link opens the
  listing in a new tab with `rel="noopener noreferrer"`.
- **Leaving mid-run**: the runs keep going on Apify (the user already paid
  for them). The history entry keeps the run ids; reopening it resumes the
  polling or fetches the finished datasets.
- **Errors** (per site, the others carry on):
  - 401: "Apify no longer accepts your token", with a link to Settings;
  - 402 or an actor that needs renting: "This actor needs credit or a rental
    on your Apify account", with a link to the actor;
  - run `FAILED`, `TIMED-OUT` or `ABORTED`: shown on that site's row.

Job text from actors is untrusted: it is rendered as text only (React
escaping), never as HTML, and links are only followed when they are
`http(s)`.

### Rule exception (approved 2026-11-24)

AGENTS.md says: never call `fetch` directly instead of `serverFetch` or
`clientFetch`. Both helpers are built for Jobak's own API (base URL,
cookies, error codes). The proposal is one narrow exception, written into
AGENTS.md and `docs/frontend/DATA_FETCHING.md`:

> A third-party API called from the browser with the user's own key (today:
> Apify) has one client file in its module (`lib/apify-client.ts`) that may
> call `fetch`, to that API's origin only. Its calls still run through
> TanStack Query.

The ESLint boundaries stay as they are.

### Docs

`docs/features/JOB_COLLECTION.md`: what the user does, where the token
lives and why, the catalogue and how to add an actor, the cost caps, and
the security notes. The architecture doc's Apify example is updated to the
client-side gate.

## Left to the builder

- Final actor picks per site after reading each schema; the table above is
  the starting list.
- Copy, layout details, and the poll and back-off timings.
- Whether the Settings tab is named "Job collection" or "Apify".

## Testing

- Unit tests (tsx, offline): `readJob` for every actor against a saved real
  item, the merge and dedupe, the CSV, the estimate, and the token store
  (per account, broken `localStorage`).
- One real run per actor, 3 jobs each, only if the user agrees to the spend
  (under $1 for all 43 at the listed prices, likely about $0.30, on
  whichever Apify account they choose).
  Otherwise each `buildInput` is checked against the actor's published
  input schema, and `readJob` against its inferred output schema, without
  running anything.
- The UI in the isolated test browser with a fake Apify (the same harness
  used for the AI tools): locked, unlocked, running, Stop, a failed site,
  results, history.
