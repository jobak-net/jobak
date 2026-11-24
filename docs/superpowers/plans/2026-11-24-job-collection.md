# Job collection (Apify) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dashboard page, "Find jobs elsewhere", that runs curated Apify
job actors from the user's browser on their own Apify account. It's
unlocked by an optional Apify token kept only in the browser and added in a
new Settings tab.

**Architecture:** A new frontend module `src/frontend/modules/job-collection/`:
- one client file calls `api.apify.com`, through TanStack Query;
- the token lives in `localStorage`, keyed per account;
- a catalogue in code describes 43 actors, each with `buildInput` and
  `readJob`.

Jobak's server only supplies the account id and the preferred country, and
never sees the token or any results.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query v5,
TypeScript, Tailwind 4, Apify API v2. Tests use Node's built-in test runner
through tsx (`node --import tsx --test`), with no new dependency.

**Spec:** `docs/superpowers/specs/2026-11-24-apify-marketplace-design.md`

## Global Constraints

- The token never reaches Jobak: no request to `/api/*` carries it, it is
  never logged, and it never goes in a URL. Apify gets it as
  `Authorization: Bearer <token>`.
- Only `lib/apify-client.ts` may call `fetch`, and only to
  `https://api.apify.com/v2/`. The rule exception is written into AGENTS.md
  and `docs/frontend/DATA_FETCHING.md` (Task 2).
- Every run is started with `maxItems = jobsPerSite` and
  `maxTotalChargeUsd = round(siteEstimate × 1.1, 4)`.
- Jobs per site: `10 | 25 | 50 | 100`, default `25`.
- The catalogue rules, from the spec:
  - searches by title or keyword plus a country or location;
  - at least 20 users in the last 30 days, not deprecated;
  - at most about $0.006 per job;
  - never starts other actors;
  - not mainly contact collection.
- `buildInput` turns off notifications, webhooks, app connectors,
  incremental mode, contact extraction, browser fallbacks and AI options,
  and sets the actor's own result cap to `jobsPerSite`.
- `readJob` never returns contact fields. It drops items without a title or
  an `http(s)` URL.
- Job text is rendered as text only. Links use `target="_blank"
  rel="noopener noreferrer"` and only `http:`/`https:`.
- Storage keys:
  - `jobak.apify-token.<accountId>`;
  - `jobak.job-collection.history.<accountId>` (last 5);
  - `jobak.job-collection.sites.<accountId>`.
- Every `localStorage` access is wrapped in try/catch, and a failure reads
  as empty.
- Status polling uses `GET /v2/actor-runs/{id}?waitForFinish=30`. The
  maximum Apify allows is 60.
- Terminal run states: `SUCCEEDED`, `FAILED`, `ABORTED`, `TIMED-OUT`.
- User-facing copy is plain sentence case, matching the AI tools.
- Commits: this repo's owner commits. Each task ends at a checkpoint, and
  there's no `git commit` unless the user asks.
- Live Apify calls in development read `APIFY_API_KEY` from `.env`. Never
  print it. The approved live budget is 3 jobs per actor, under $1 in
  total.

## Review Focus

1. **Token revoked or expired while runs are going.** That site's row says
   "Apify no longer accepts your token" with a link to Settings, and the
   other sites carry on. Test: Task 2 `apify-client.test.ts` maps 401 to
   `kind: "unauthorized"`, and Task 9 `collection-state.test.ts` keeps the
   other runs going.
2. **Tab closed or page reloaded mid-run.** The history entry resumes
   polling the same run ids; nothing is started twice. Test: Task 7
   `history.test.ts` and Task 9 `collection-state.test.ts` "resume uses
   stored run ids".
3. **Actor output that's junk or hostile.** Missing fields, a numeric
   title, or a `javascript:` URL is dropped and counted, never rendered as
   a link. Test: Task 4 `read-fields.test.ts`.
4. **A country a site can't search.** The site shows "Doesn't cover
   {country}", can't be picked, and `buildInput` is never called with an
   unmapped code. Test: Task 5 `catalogue.test.ts`, which runs over every
   entry.
5. **Storage blocked (private window, site data cleared).** The page stays
   locked with "Your browser isn't keeping site data, so the token can't be
   saved here", and Settings shows the same instead of failing silently.
   Test: Task 3 `token-store.test.ts`.

---

### Task 1: Account id in `/api/v1/me`

**Files:**
- Modify: `src/shared/contracts/account.ts` (add `id: string` to `AccountStatus["user"]`)
- Modify: `src/backend/modules/account/application/get-account-status.use-case.ts:26`
- Modify: `src/backend/modules/account/domain/ports.ts` (only if the port's user lacks `id`)
- Modify: `package.json` (add the `test` script)

**Interfaces:**
- Produces: `requireDashboardUser(): Promise<{ id: string; fullName: string | null; email: string | null }>`, unchanged name.

- [ ] **Step 1:** Add `"test": "node --import tsx --test \"src/**/*.test.ts\""` to `package.json` scripts.
- [ ] **Step 2:** Add `id` to the contract and return `user.id` (the internal `users.id` UUID, never the Clerk id) from the use case.
- [ ] **Step 3:** Run `npx tsc --noEmit -p tsconfig.json`. Expected: exit 0. Every consumer of `AccountStatus` still compiles.
- [ ] **Step 4:** Checkpoint.

### Task 2: Apify client and the rule exception

**Files:**
- Create: `src/frontend/modules/job-collection/lib/apify-client.ts`
- Create: `src/frontend/modules/job-collection/lib/apify-client.test.ts`
- Modify: `AGENTS.md` (Data fetching: the exception paragraph from the spec, verbatim)
- Modify: `docs/frontend/DATA_FETCHING.md` (same exception, plus a pointer to the module)

**Interfaces:**
- Produces:
  ```ts
  type RunStatus = "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "ABORTING" | "ABORTED" | "TIMING-OUT" | "TIMED-OUT";
  interface ApifyRun { id: string; status: RunStatus; defaultDatasetId: string; itemCount: number; usageTotalUsd: number | null }
  interface ApifyAccount { username: string; plan: string }
  interface ApifyLimits { usedUsd: number; limitUsd: number }
  interface ActorPrice { perJobUsd: number | null; startUsd: number }
  class ApifyError extends Error { kind: "unauthorized" | "payment" | "not-found" | "invalid-input" | "rate-limited" | "unavailable" | "network" }
  verifyToken(token: string): Promise<ApifyAccount>                       // GET /users/me
  getLimits(token: string): Promise<ApifyLimits>                          // GET /users/me/limits
  actorPrice(actorId: string): Promise<ActorPrice | null>                 // GET /store?search=…, no token; null when not found
  startRun(token: string, actorId: string, input: object, opts: { maxItems: number; maxTotalChargeUsd: number }): Promise<ApifyRun>
  getRun(token: string, runId: string, waitForFinishSecs?: number): Promise<ApifyRun>
  abortRun(token: string, runId: string): Promise<ApifyRun>
  datasetItems(token: string, datasetId: string, limit: number): Promise<unknown[]>  // ?clean=true&limit=
  ```
  `actorId` uses `user/name` and is sent as `user~name` in paths.
  `itemCount` comes from `stats.itemCount` or else 0. `usageTotalUsd` comes
  from `usageTotalUsd` or else null.

- [ ] **Step 1: Write the failing tests** with a fake `globalThis.fetch` that records each request:
  - `"sends the token only as a Bearer header"`: every recorded request has `authorization: "Bearer t"`, and no URL contains `t` or `token=`.
  - `"only calls api.apify.com"`: every URL starts with `https://api.apify.com/v2/`.
  - `"starts a run with the caps"`: the URL is `/acts/user~name/runs?maxItems=25&maxTotalChargeUsd=0.0605`, the method is POST, and the body is the JSON input.
  - `"maps statuses to error kinds"`: 401 and 403 give `unauthorized`, 402 gives `payment`, 404 gives `not-found`, 400 gives `invalid-input`, 429 gives `rate-limited`, 5xx gives `unavailable`, and a thrown fetch gives `network`.
  - `"getRun waits for the finish"`: the URL ends with `?waitForFinish=30`.
  - `"actorPrice reads the FREE tier"`: given a store item with `PAY_PER_EVENT` events `{ "actor-start": 0.005, "result": FREE 0.001 }`, it returns `{ perJobUsd: 0.001, startUsd: 0.005 }`. It reads `pricePerUnitUsd` for `PRICE_PER_DATASET_ITEM`.
- [ ] **Step 2:** Run `pnpm test`. Expected: FAIL, because the module isn't found.
- [ ] **Step 3:** Implement `apify-client.ts`.
  - Use one private `call(path, { token?, method?, body? })` that maps errors.
  - Error bodies are `{ error: { type, message } }`. Keep the `message` for the developer console only, never in UI copy.
  - For the start fee, the event key or title matches `/start|init/i`; the first other event is the per-job price.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5:** Add the exception to AGENTS.md and DATA_FETCHING.md. Run `npx eslint src/frontend/modules/job-collection`. Expected: exit 0.
- [ ] **Step 6:** Checkpoint.

### Task 3: Token store and `useApifyToken`

**Files:**
- Create: `src/frontend/modules/job-collection/lib/token-store.ts`
- Create: `src/frontend/modules/job-collection/lib/token-store.test.ts`
- Create: `src/frontend/modules/job-collection/hooks/use-apify-token.ts`

**Interfaces:**
- Consumes: `checkKeyFormat("apify", value)` from `@/shared/credentials` (the existing shared helper; read its return shape there); `verifyToken` (Task 2).
- Produces:
  ```ts
  type TokenRead = { state: "saved"; token: string } | { state: "none" } | { state: "blocked" }
  readToken(accountId: string, storage?: Storage): TokenRead
  saveToken(accountId: string, token: string, storage?: Storage): boolean   // false when blocked
  removeToken(accountId: string, storage?: Storage): void
  useApifyToken(accountId: string): {
    status: "loading" | "saved" | "none" | "blocked"; token: string | null;
    account: ApifyAccount | null;          // from verifyToken, cached by TanStack (staleTime 5 min)
    save(value: string): Promise<void>;    // format check → verifyToken → saveToken; throws ApifyError or Error(format hint)
    remove(): void;
  }
  ```
  The hook reads storage in an effect after mount (status `"loading"` until
  then), so the server render and the first client render match.

- [ ] **Step 1: Write the failing tests** with an in-memory `Storage` and a throwing one:
  - `"keys by account"`: a save for `a` isn't visible to `b`, and the key is exactly `jobak.apify-token.a`.
  - `"blocked storage reads as blocked"`: when `getItem` throws, `readToken` returns `{ state: "blocked" }` and `saveToken` returns `false`.
  - `"remove clears only that account"`.
- [ ] **Step 2:** Run `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `token-store.ts`, then the hook. `save` uses `useGenericMutation` around `verifyToken`.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5:** Checkpoint.

### Task 4: Catalogue types, field readers, countries

**Files:**
- Create: `src/frontend/modules/job-collection/types/catalogue.ts`
- Create: `src/frontend/modules/job-collection/lib/read-fields.ts`
- Create: `src/frontend/modules/job-collection/lib/read-fields.test.ts`
- Create: `src/frontend/modules/job-collection/config/categories.ts`
- Create: `src/frontend/modules/job-collection/config/country-codes.ts`

**Interfaces:**
- Produces:
  ```ts
  type CategoryId = "mena" | "worldwide" | "remote" | "freelance" | "career-sites" | "south-asia" | "southeast-asia" | "europe" | "latin-america";
  interface SearchInput { title: string; country: string /* ISO-2 */; city: string; jobsPerSite: 10 | 25 | 50 | 100 }
  interface CollectedJob { site: string; title: string; company: string | null; location: string | null; url: string; postedAt: string | null; salary: string | null }
  interface ActorEntry {
    id: string; site: string; actorId: string; category: CategoryId;
    description: string; storeUrl: string;
    covers: "any" | readonly string[];               // ISO-2 codes
    fallbackPrice: { perJobUsd: number; startUsd: number };
    buildInput(search: SearchInput): Record<string, unknown>;   // only called when covers(country)
    readJob(item: unknown): Omit<CollectedJob, "site"> | null;
  }
  CATEGORIES: readonly { id: CategoryId; label: string }[]   // order and labels exactly as in the spec's catalogue headings
  COUNTRY_CODES: readonly string[]                            // ISO 3166-1 alpha-2, all assigned codes
  countryLabel(code: string): string                          // Intl.DisplayNames("en", { type: "region" }), falls back to the code
  coversCountry(entry: ActorEntry, code: string): boolean
  // read-fields.ts
  firstText(item: unknown, paths: string[]): string | null    // dotted paths, trims, string or number only, null for empty
  safeUrl(value: string | null): string | null                // http(s) only, else null
  isoDate(value: unknown): string | null                      // ISO string from ISO, epoch ms/s, or "2 days ago"-style text left as-is
  ```

- [ ] **Step 1: Write the failing tests**:
  - `"safeUrl drops non-http"`: `javascript:alert(1)`, `data:…` and `ftp://x` give null; `https://a.b/c` is kept.
  - `"firstText reads dotted paths in order"`: `{ company: { name: "Khazna" } }` with `["companyName", "company.name"]` gives `"Khazna"`.
  - `"firstText ignores objects and blanks"`: `{ title: "  " }` gives null, and `{ title: { x: 1 } }` gives null.
  - `"countryLabel names codes"`: `countryLabel("EG") === "Egypt"`.
- [ ] **Step 2:** Run `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. `COUNTRY_CODES` is a literal array, so it isn't environment-dependent.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5:** Checkpoint.

### Task 5: The 43 actor entries

One entry per site from the spec's tables, in
`config/actors/<category>.ts`, with `config/actors/index.ts` exporting
`ACTORS: readonly ActorEntry[]` in category order.

**Files:**
- Create: `src/frontend/modules/job-collection/config/actors/{mena,worldwide,remote,freelance,career-sites,south-asia,southeast-asia,europe,latin-america,index}.ts`
- Create: `src/frontend/modules/job-collection/config/actors/__fixtures__/<entry-id>.json` (one real dataset item per actor, contact fields removed)
- Create: `src/frontend/modules/job-collection/config/actors/catalogue.test.ts`
- Create: `scripts/apify-check.ts` (+ a `check:apify` script in `package.json`)

**Interfaces:**
- Consumes: Task 4 types and readers.
- Produces: `ACTORS`, `actorById(id: string): ActorEntry | undefined`.

Per actor, in this order:
1. Read the input schema with the Apify MCP (`fetch-actor-details`, `output: { inputSchema: true, outputSchema: true }`).
2. Write `buildInput`. Map the ISO code to the actor's own value (Wuzzuf `EG`, GCC-style `uae`…). `covers` is exactly the set the actor's enum accepts, or `"any"` for free-text locations.
3. Check it for free: `pnpm check:apify --validate <entry-id>` calls `POST /v2/acts/{id}/validate-input` for 3 sample searches (one covered country, with and without a city).
4. Run it once live: `pnpm check:apify --live <entry-id>` starts a run with `maxItems=3` and `maxTotalChargeUsd = 3 × perJob + start + 10%`. It waits, saves the first item (contact fields stripped) as the fixture, and prints `readJob` on all 3 items.
5. If the actor fails a rule on this closer look, swap in the next most-used actor for that site, or drop the site. Record either change in the spec's catalogue section.

`scripts/apify-check.ts` reads `APIFY_API_KEY` with `--env-file=.env`,
never prints it, and refuses `--live` without an entry id or `--all`.

- [ ] **Step 1: Write the failing catalogue test**, over every entry in `ACTORS`:
  - `"43 entries, unique ids, every category present"`. Adjust the count only when Step 5 recorded a swap or drop.
  - `"buildInput caps results"`: for a covered country, the input holds `jobsPerSite` in the actor's own cap field.
  - `"buildInput turns extras off"`: the serialised input has no key matching `/telegram|slack|discord|whatsapp|webhook|appConnector|anthropic|openai/i` with a truthy value, and `incrementalMode`, `browserFallback` and `enrichEmails` (where they exist) are false.
  - `"readJob reads its fixture"`: it returns a non-empty `title` and a `safeUrl`-valid `url`, and no key named `email`, `phone` or `contact*`.
  - `"uncovered countries are refused"`: for an entry with a list `covers`, `coversCountry(entry, "ZZ")` is false.
- [ ] **Step 2:** Run `pnpm test`. Expected: FAIL (no entries).
- [ ] **Step 3:** Add MENA and worldwide (9 entries) through steps 1 to 5 above. Run `pnpm test`; their cases pass.
- [ ] **Step 4:** Add remote, freelance and career sites (13 entries) the same way.
- [ ] **Step 5:** Add South Asia and Southeast Asia (8 entries).
- [ ] **Step 6:** Add Europe and Latin America (13 entries).
- [ ] **Step 7:** Run `pnpm test`. Expected: PASS for all entries. Report the total live spend, from the summed `usageTotalUsd`.
- [ ] **Step 8:** Checkpoint.

### Task 6: Results, estimate, CSV

**Files:**
- Create: `src/frontend/modules/job-collection/lib/results.ts`
- Create: `src/frontend/modules/job-collection/lib/results.test.ts`

**Interfaces:**
- Produces:
  ```ts
  siteEstimate(price: ActorPrice | { perJobUsd: number; startUsd: number }, jobsPerSite: number): number   // start + n × perJob, rounded to 4 dp; perJob null → fallback
  runCap(estimate: number): number                    // round(estimate × 1.1, 4)
  mergeJobs(batches: CollectedJob[][]): CollectedJob[]  // dedupe by normalised url, else lower(title)+lower(company); first seen wins; newest postedAt first, undated last
  toCsv(jobs: CollectedJob[]): string                  // header: Title,Company,Location,Posted,Salary,Site,Link ; RFC 4180 quoting; cells starting with = + - @ prefixed with '
  ```

- [ ] **Step 1: Write the failing tests**:
  - `"estimate"`: `siteEstimate({ perJobUsd: 0.002, startUsd: 0.005 }, 25) === 0.055`, and `runCap(0.055) === 0.0605`.
  - `"dedupes the same listing from two sites"`: the same URL with `?utm=x` and without gives one row.
  - `"sorts newest first, undated last"`.
  - `"csv escapes quotes, commas and formulas"`: the title `=HYPERLINK("x")` gives `"'=HYPERLINK(""x"")"`.
- [ ] **Step 2:** Run `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. URL normalisation: lowercase the host, drop `utm_*` and `refId`/`trackingId` params, drop the hash and the trailing slash.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5:** Checkpoint.

### Task 7: Search history and remembered sites

**Files:**
- Create: `src/frontend/modules/job-collection/lib/history.ts`
- Create: `src/frontend/modules/job-collection/lib/history.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface HistoryEntry { id: string; search: SearchInput; runs: { site: string; runId: string }[]; startedAt: string }
  readHistory(accountId: string, storage?: Storage): HistoryEntry[]
  addHistory(accountId: string, entry: HistoryEntry, storage?: Storage): HistoryEntry[]  // newest first, max 5
  readSites(accountId: string, storage?: Storage): string[] | null
  saveSites(accountId: string, sites: string[], storage?: Storage): void
  ```
  Malformed JSON reads as empty. Unknown site ids are filtered out against
  `actorById` on read.

- [ ] **Step 1: Write the failing tests**: `"keeps the 5 newest"`, `"malformed storage reads as empty"`, `"drops sites no longer in the catalogue"`, `"blocked storage reads as empty and saves do nothing"`.
- [ ] **Step 2:** Run `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5:** Checkpoint.

### Task 8: Settings tab "Job collection"

**Files:**
- Create: `src/frontend/modules/job-collection/components/apify-token-panel.tsx`
- Create: `src/frontend/modules/job-collection/index.ts` (exports `ApifyTokenPanel`; Task 9 adds the view)
- Modify: `src/frontend/modules/settings/components/settings-panels.tsx` (a `TabId` `"job-collection"` after `"ai"`, label "Job collection", and its copy and panel)
- Modify: `src/frontend/modules/settings/views/settings-view.tsx` (pass through `accountId` and `initialTab`)
- Modify: `src/app/(protected)/dashboard/settings/page.tsx` (pass `user.id`; read `searchParams.tab`, accepting only known tab ids)
- Modify: `src/shared/routes/routes.ts` (`JOB_COLLECTION_HREF = "/dashboard/job-collection"`, `APIFY_SETTINGS_HREF = "/dashboard/settings?tab=job-collection"`)

**Interfaces:**
- Consumes: `useApifyToken` (Task 3).
- Produces: `<ApifyTokenPanel accountId={string} />`.

Panel content, from the spec:
- One line on what the token is for, that it stays in this browser only,
  and that runs spend their Apify credit.
- A link to `https://console.apify.com/settings/integrations`, suggesting a
  token limited to running actors.
- A password-type input and a **Check and save** button.
- Once saved: "Connected as {username}, {plan}" and **Remove**.
- On 401: "Apify didn't accept this token". A format failure shows the
  existing hint ("Apify tokens start with apify_api_").
- In the blocked state: the storage message from Review Focus 5.

- [ ] **Step 1:** Implement the panel and the tab, and resolve `searchParams` the way this Next version does (read `node_modules/next/dist/docs/` for the page `searchParams` type before writing).
- [ ] **Step 2:** Run `npx tsc --noEmit -p tsconfig.json` and `npx eslint src/frontend/modules/job-collection src/frontend/modules/settings "src/app/(protected)/dashboard/settings"`. Expected: both exit 0.
- [ ] **Step 3:** Check it in the isolated test browser (esbuild harness, as for the AI tools) with a fake `fetch` for `api.apify.com`: save gives the connected line, 401 gives the error, Remove gives the empty state, and blocked `localStorage` gives the storage message. Then once with the real `APIFY_API_KEY` typed into the harness (not saved anywhere else). Expected: the real username shows.
- [ ] **Step 4:** Checkpoint.

### Task 9: The page

**Files:**
- Create: `src/frontend/modules/job-collection/lib/collection-state.ts` (a pure reducer: sites to runs to results)
- Create: `src/frontend/modules/job-collection/lib/collection-state.test.ts`
- Create: `src/frontend/modules/job-collection/hooks/use-collection.ts`
- Create: `src/frontend/modules/job-collection/components/{apify-gate,search-form,site-picker,run-progress,results-table,history-list}.tsx`
- Create: `src/frontend/modules/job-collection/views/job-collection-view.tsx`
- Create: `src/frontend/modules/job-collection/api/job-collection.loader.ts` + `server.ts`
- Create: `src/app/(protected)/dashboard/job-collection/page.tsx`
- Modify: `src/frontend/modules/dashboard/config/nav-items.ts` (Workspace: "Find jobs elsewhere", `JOB_COLLECTION_HREF`, lucide `Radar`)

**Interfaces:**
- Consumes: Tasks 2 to 7.
- Produces:
  ```ts
  loadJobCollectionPage(): Promise<{ accountId: string; country: string }>   // requireDashboardUser().id; preferences.location.countries[0] ?? ""
  <JobCollectionView accountId country />
  type SiteRun = { site: string; phase: "starting" | "running" | "fetching" | "done" | "failed" | "stopped"; runId?: string; datasetId?: string; found: number; dropped: number; error?: ApifyError["kind"] | "run-failed" }
  collectionReducer(state, action): state   // actions: start(sites), started(site, run), polled(site, run), fetched(site, jobs, dropped), failed(site, kind), stop(), resume(entry)
  ```

Behaviour, from the spec:
- **Gate:**
  - `useApifyToken` is `"loading"`: show a skeleton;
  - `"none"`: `LockedFeature` with feature "job collection", requirement
    "your Apify token", action "Add your Apify token" linking to
    `APIFY_SETTINGS_HREF`;
  - `"blocked"`: the lock with the storage note.
- **Header:** "Credit left: ${limitUsd − usedUsd}" from `getLimits`, hidden
  on error.
- **Site picker:**
  - grouped by `CATEGORIES`;
  - sites that cover the chosen country come first, marked "Covers
    {country}"; the rest fold under "Other regions";
  - a filter box;
  - first visit preselects `linkedin`, `indeed` and the `mena` entries that
    cover the country; later visits use `readSites`.
- **Live prices:** from `actorPrice` per picked site (TanStack, staleTime
  1 h), with `fallbackPrice` as the fallback.
- **Run:**
  - the label reads "Up to about ${Σ siteEstimate}";
  - it's disabled while starting, with no title, or with no covered site
    picked;
  - starts run in parallel, then `addHistory`.
- **Polling:** a `useQueries` entry per running site calls
  `getRun(…, 30)`; `refetchInterval` is 0 once terminal; `retry` is off for
  `unauthorized`/`payment`.
- **Results:** on `SUCCEEDED`, or after Stop, `datasetItems(…,
  jobsPerSite)` goes through `readJob`. Items it rejects count as
  `dropped`.
- **Stop:** `abortRun` for each non-terminal run, then fetch what exists.
- **Errors:** the per-site copy from the spec, plus "No jobs came back for
  this search" for a successful run with 0 items.
- **Results table:** `mergeJobs` rows (title, company, location, posted,
  site, Open link), a count, and **Download CSV** (`toCsv`, Blob + object
  URL).
- **History:** list rows ("{title} in {country}, {n} sites, {time ago}").
  Opening one dispatches `resume`, which polls or fetches the stored run
  ids. A 404 on its dataset shows "Apify no longer has these results" and
  a "Run it again" button.

- [ ] **Step 1: Write the failing reducer tests**:
  - `"one site failing leaves the others running"`;
  - `"stop marks only unfinished runs stopped"`;
  - `"resume uses stored run ids and never adds a start"`;
  - `"dropped counts add up"`.
- [ ] **Step 2:** Run `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement the reducer, then the hook, components, view, loader, page and nav.
- [ ] **Step 4:** Run `pnpm test`, `npx tsc --noEmit -p tsconfig.json` and `npx eslint src/frontend/modules/job-collection "src/app/(protected)/dashboard/job-collection" src/frontend/modules/dashboard/config`. Expected: all exit 0.
- [ ] **Step 5:** Check it in the isolated test browser with a fake Apify:
  - locked;
  - a covered and an uncovered country;
  - run 3 sites with one returning 401;
  - Stop;
  - results, dedupe and CSV;
  - reload, then resume from history;
  - at 375 px width.

  Then one real search with `APIFY_API_KEY` (2 sites × 10 jobs, within the
  approved budget). Expected: real rows, and the run caps visible on the
  runs in Apify's console.
- [ ] **Step 6:** Checkpoint.

### Task 10: Docs, build, wrap-up

**Files:**
- Create: `docs/features/JOB_COLLECTION.md`
- Modify: `docs/frontend/ARCHITECTURE.md` (the Apify gate example becomes the client-side `ApifyGate`)
- Modify: `docs/superpowers/specs/2026-11-24-apify-marketplace-design.md` (any actor swaps or drops from Task 5)

- [ ] **Step 1:** Write `JOB_COLLECTION.md`:
  - what the user does;
  - where the token lives and why;
  - the catalogue and how to add an actor (the Task 5 procedure, including
    `pnpm check:apify`);
  - the cost caps;
  - the security notes;
  - the test commands.
- [ ] **Step 2:** Run `rm -rf .next/dev/types && pnpm build`. Expected: "Compiled successfully" and the route `/dashboard/job-collection` listed.
- [ ] **Step 3:** Run `pnpm test`. Expected: all pass.
- [ ] **Step 4:** Report to the user: what was built, the live spend, the actor changes, and the restart of `next dev`. Ask whether to commit, and on which branch.
