# Find jobs elsewhere (job collection)

`/dashboard/job-collection` searches 39 job sites at once with
[Apify](https://apify.com) actors. The actors run **on the user's own Apify
account, straight from their browser**. Jobak's server never sees the Apify
token, the search or the jobs found.

Design: [`docs/superpowers/specs/2026-11-24-apify-marketplace-design.md`](../superpowers/specs/2026-11-24-apify-marketplace-design.md).
Code: `src/frontend/modules/job-collection/`.

## What the user does

1. **Adds an Apify token**, which is optional: without one, the page stays
   locked.
   - It can be pasted right into the lock card on the page, and the page
     unlocks in place, with no trip to Settings.
   - It can also be added, replaced or removed in Settings › Job collection
     (`/dashboard/settings?tab=job-collection`).
   - Both use the same form, `ApifyTokenForm`.
   - The format is checked (`apify_api_…`), then the token is checked with
     Apify (`GET /v2/users/me`). Only then is it saved, in this browser's
     `localStorage`.
   - The tab shows "Connected as {username}, {plan} plan", with Remove.
   - A token with "Limit token permissions" turned on must still be able to
     read the account, run actors and read their results. A 403 from Apify
     is shown as "not allowed", not as a rejected token. A limited token
     hasn't been tried live yet.
2. **Searches** on the page:
   - fields: job title, country, optional city, jobs per site
     (10 / 25 / 50 / 100);
   - sites are grouped by category, and the ones that cover the chosen
     country come first. The rest fold under "Other regions" and can't be
     picked for that country;
   - each card shows the live free-plan price;
   - the Run button says "Run search, up to about $X" before anything
     starts.
3. **Watches the runs.** Each site has a row (waiting, running, done,
   failed). Stop aborts every running run at once, retries an abort that
   fails, and keeps what the runs found.
4. **Reads the results.** When a search finishes with jobs, the page
   scrolls smoothly to the table (instantly for people who ask for reduced
   motion). The table lists jobs newest first, each linking to the original
   listing, plus **Download CSV**. Duplicates are merged in two cases:
   - the same link;
   - the same title, company and place on two different sites.

   Matching postings from one site stay separate.
5. **Comes back later.** The last 5 searches are remembered on the device.
   Opening one follows its runs again (nothing new starts), or re-reads
   their finished results.

The header shows the Apify credit left this month.

## Where things live, and why

| What | Where | Why |
|---|---|---|
| Apify token | `localStorage` key `jobak.apify-token.<accountId>` | The user chose browser-only: no server load, nothing for Jobak to store or leak. Per account, so two accounts on one browser don't share it. |
| Last 5 searches (search + run ids) | `jobak.job-collection.history.<accountId>` | So a closed tab can come back to its runs. Results themselves stay on Apify. |
| Last picked sites | `jobak.job-collection.sites.<accountId>` | A convenience. |
| The catalogue | `config/actors/*.ts` | Input and output mapping, coverage and price move together, in code. |

The only Jobak data the page uses:
- the account id (`GET /api/v1/me`, which now returns `user.id`);
- the first country in the user's job preferences (`GET /api/v1/preferences`).

Storage can be blocked (a private window, blocked site data). Every access
is guarded: the page stays locked and says so, rather than failing silently.

**Security:**
- The token is sent to Apify only, as `Authorization: Bearer …`, never in a
  URL. It's never logged.
- `lib/apify-client.ts` is the only file that calls `fetch` here, and only
  to `https://api.apify.com/v2/`. This is the one exception to the
  data-fetching rule (AGENTS.md, [DATA_FETCHING.md](../frontend/DATA_FETCHING.md)).
- Anything a script can read on Jobak's pages can read `localStorage`. That
  trade-off was accepted, which is why the panel suggests a limited token.
- Actor output is text written by strangers. It's rendered as text only.
  Links are kept only if they are `http(s)`, checked twice: in `readJob`
  and again in `runCollection`. They open with `noopener noreferrer`.
- The CSV defuses cells starting with `= + - @`, so spreadsheets don't run
  them as formulas.

## Cost

- **Estimate per site:** the start fee plus jobs per site × the price per
  job. Actors that page (Google Jobs, 10 per page) round up to whole pages.
- **Cap per run:** `maxTotalChargeUsd` is the estimate plus 10%, and
  `maxItems` is jobs per site, both enforced by Apify.
- **The dollar cap is the one that matters.** Many pay-per-event actors keep
  collecting, and charging, past `maxItems` until they hit it ("Stopped at
  the max charge limit"). So the user never pays more than the estimate
  shown plus 10%.
- **Run costs settle after the run ends.** The figure shown at the end is
  "about", and the final charge can be a little higher.

## How a search runs

`lib/run-collection.ts` (`runCollection`) is one async function, run inside
a TanStack mutation (`hooks/use-collection.ts`). It reports events to
`lib/collection-state.ts` (`collectionReducer`):

- **At most `concurrentRuns` at once.** That's `maxConcurrentActorJobs`
  from `GET /v2/users/me/limits`: **5 on the free plan**. The other sites
  wait.
- **When Apify says the account is too busy:** the 402
  `concurrent-runs-limit-exceeded` error is read as `busy`, not as missing
  credit. The site waits 5 s and retries, up to 30 times.
- **Polling:** each run is long-polled with
  `GET /v2/actor-runs/{id}?waitForFinish=30`.
- **When a run ends, its dataset is always read**
  (`GET /v2/datasets/{id}/items?clean=true&limit=n`). Apify doesn't put
  every actor's item count on the run; `chargedEventCounts` has it for some
  actors and is used for progress only.
- **Stop** (the `stop` signal): nothing new starts, and every running run
  is aborted straight away, not after the current long poll. A failed abort
  is retried. What the runs collected is kept.
- **Leaving the page** (the `leave` signal, fired on unmount):
  - queued sites never start, and following ends;
  - runs already going finish on Apify (they were paid for). They're in
    history, so reopening the search reads them;
  - sites that never started aren't in that history entry.
- **Errors stay with their site** (each has its own wording in
  `components/run-progress.tsx`): a rejected token, missing credit, a
  refused input, gone results, the actor failing. The other sites carry on.

## The catalogue

39 sites in 9 categories (`config/categories.ts`): Egypt & the Middle East,
worldwide boards, remote and startups, freelance, company career sites,
South Asia, Southeast Asia and the Pacific, Europe, Latin America. The
spec's catalogue section lists every site, the actor behind it, and what
was left out and why.

**An actor is in only if:**
- it searches by title or keyword plus a country or location;
- at least 20 people used it in the last 30 days;
- it costs at most about $0.006 per job;
- it never starts other actors;
- it isn't mainly a contact collector;
- it accepts a per-run cost cap under $0.50.

**Each entry** (`defineActor` in `config/actors/define.ts`):
- `covers`: the countries its input accepts, or `"any"`;
- `buildInput(search)`: the actor's own input. It always sets the actor's
  result cap and turns off notifications, webhooks, incremental mode,
  contact extraction and detail enrichment;
- `readJob(item)`: through `readJobWith`, which tries the usual field names
  plus the entry's own `paths`;
- `fallbackPrice`, and `pageSize` for actors that page.

### Adding or changing an actor

1. **Read its input:** `pnpm check:apify schema user/name` (free; `FULL=1`
   for whole enums), or the Apify MCP `fetch-actor-details`.
2. **Write the entry** in its category file and add it to
   `config/actors/index.ts`. Raise `EXPECTED_COUNT` in `catalogue.test.ts`.
3. **Check the input for free:** `pnpm check:apify validate <id>`, which
   uses Apify's own input check and runs nothing.
4. **Run it once:** `pnpm check:apify live <id>`. That's 3 jobs, capped,
   and it costs a cent or a few. It saves
   `config/actors/__fixtures__/<id>.json` with contact fields removed and
   prints what `readJob` makes of each item. Fix `paths` until it reads
   well.
5. **Run `pnpm test`.** The catalogue test checks, for every entry: the
   result cap, extras turned off, the title carried, its fixture read as a
   job with an `http(s)` link and no contact fields, junk refused, and
   uncovered countries refused.

`scripts/apify-check.ts` reads `APIFY_API_KEY` from `.env` and never prints
it. It runs at most 4 actors at once.

## Testing

```bash
pnpm test                         # all unit tests (node --test via tsx), offline
pnpm check:apify validate all     # every entry's input, checked by Apify, free
pnpm check:apify live <id>        # one real run, costs credit
```

Checked on 2026-11-24:
- **Live:** all 39 entries run live once (3 jobs each). Then one real
  search through `runCollection`: Wuzzuf + LinkedIn, Egypt, 10 jobs each,
  19 merged in 16 s, both caps recorded on the runs. Total spend during
  development: $0.65.
- **UI, in an isolated browser with a fake Apify:**
  - the lock, linking to the Settings tab;
  - one site's 401 while the others finish;
  - caps per run, deduplication, and no `javascript:` links;
  - Stop, then reload and resume (nothing restarted);
  - an uncovered country, and 375 px width;
  - the Settings panel's save, reject, Remove and blocked-storage states.
