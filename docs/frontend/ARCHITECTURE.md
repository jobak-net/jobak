# Frontend architecture

The frontend is a **modular monolith of vertical slices**, the same idea as the
backend's `src/backend/modules/`: code is grouped by **what the app does**, not
by what kind of file it is. Working on feedback means opening
`modules/feedback/`, not walking `components/`, `hooks/`, `lib/api/` and
`lib/configs/` in turn.

The short version of this guide is the "Frontend modules" rule in
[`AGENTS.md`](../../AGENTS.md). How data is fetched is
[`DATA_FETCHING.md`](DATA_FETCHING.md).

## Three scopes

| Scope | Holds | Imports |
|---|---|---|
| `src/app/` | routes: pages, layouts, metadata, API route handlers | modules' public entries, `frontend/shared` |
| `src/frontend/modules/<name>/` | one feature, end to end | `frontend/shared`, other modules' public entries, `src/shared` |
| `src/frontend/shared/` | reusable frontend infrastructure and UI | `src/shared` only — never a module |
| `src/shared/` | what frontend **and** backend both need: contracts, error codes, rules | nothing from either side |

`src/app/` decides **where** a feature is reachable; a module decides **how it
works**; `frontend/shared` is what they're built from.

## A module

```
modules/feedback/
├── api/
│   ├── feedback.api.ts         sendFeedback — one endpoint, via clientFetch + unwrap
│   └── feedback.mutations.ts   useSendFeedback — useGenericMutation on it
├── components/                 the form and one file per region
├── hooks/use-feedback-form.ts  the form's state and actions
├── config/feedback-categories.ts
├── views/feedback-view.tsx     the page's content
└── index.ts                    the public API: FeedbackView
```

Folders a module may have — **only the ones it uses**:

| Folder | What goes in it |
|---|---|
| `api/` | `<name>.api.ts` (endpoint functions), `<name>.queries.ts`, `<name>.mutations.ts`; server-only `<name>.loader.ts` / `<name>.guard.ts` (call `serverFetch`) |
| `components/` | the feature's components, one per screen region |
| `hooks/` | the feature's hooks (`use-<name>.ts`): state and actions |
| `lib/` | pure helpers: formatting, calculations, mapping |
| `types/` | frontend-only types. API shapes are **not** here: they're `src/shared/contracts/` |
| `config/` | the feature's constants and option lists |
| `views/` | what a page renders: `<Name>View` composes the components |
| `index.ts` | the client-safe public API |
| `server.ts` | the server-only public API: loaders and guards, starts with `import "server-only"` |

A module with sub-features keeps one slice per sub-feature inside it, each
shaped like a small module — e.g. `modules/ai-tools/cv-review/`,
`modules/ai-tools/cover-letter/`, with code they share in
`modules/ai-tools/shared/`.

### Two entries, and why

`serverFetch` imports `next/headers` and is `server-only`. If one `index.ts`
exported a loader and a client component, a client component importing that
`index.ts` would fail the build. So:

```ts
import { FeedbackView } from "@/frontend/modules/feedback";            // anywhere
import { loadJobBoard } from "@/frontend/modules/job-board/server";    // server code only
```

`frontend/shared/api` follows the same split: `@/frontend/shared/api` and
`@/frontend/shared/api/server`.

### Export only what others need

The public API is a contract with the rest of the app, not a list of the
folder. Feedback exports `FeedbackView` and nothing else, because nothing else
is used outside it. When another module needs something, export it then.

## Import rules

```
module A → frontend/shared                     ✓
module A → @/frontend/modules/B  (or B/server) ✓  when there's a reason
module A → @/frontend/modules/B/components/x   ✗  internal to B
frontend/shared → any module                   ✗
inside a module                                relative imports (../api/feedback.mutations)
anything frontend → src/backend                ✗  (HTTP only; see DATA_FETCHING.md)
```

Modules depending on each other should be rare and one-way. The intended one
today: **preferences → onboarding**. Onboarding owns the step engine (the
questions, the draft, the search preview); the dashboard preferences form
reuses it through `@/frontend/modules/onboarding`.

## What is "shared"

Shared is for what is **already** used by more than one feature, or is
infrastructure no feature owns. Not for what might be reused one day — that
stays in its feature, and moves out when the second user appears.

| | `frontend/shared/` | `modules/<name>/` |
|---|---|---|
| UI | `Button`, `Card`, `Field`, `ScoreRing` | the feedback form, a job filter |
| Hooks | `useDebouncedValue`, `useScrolled` | `useFeedbackForm` |
| API | `clientFetch`, `serverFetch`, `ApiError`, query defaults | endpoint functions and their hooks |
| Lib | `cn`, json-ld helpers | feature formatting and rules |
| Config | site metadata | category options, step lists |

`frontend/shared/` layout:

```
shared/
├── api/         how the backend is reached (index.ts + server.ts)
├── ui/          visual building blocks: Button, Card, Field, Chip…
├── components/  app-level pieces built from them: PageIntro / PageShell, LoadFailed, JsonLd
├── hooks/       hooks that don't call the backend
├── lib/         generic helpers
├── config/      app-wide configuration
├── providers/   RootProvider, QueryProvider, AuthModeProvider
├── styles/      fonts
└── mocks/       placeholder data for the unbuilt dashboard pages (temporary)
```

## A page

Metadata stays in the page (Next reads it from there); everything the page
shows is the module's:

```tsx
// src/app/(public)/feedback/page.tsx
import { FeedbackView } from "@/frontend/modules/feedback";

export const metadata: Metadata = { title: "Feedback — Jobak", /* … */ };

export default function FeedbackPage() {
  return <FeedbackView />;
}
```

A page that needs data runs guard → loader → view, the loader and guard coming
from the module's `server.ts`. A page whose metadata depends on data asks the
module for it too:

```tsx
// src/app/(public)/jobs/page.tsx
export async function generateMetadata({ searchParams }: PageProps) {
  return jobBoardMetadata(await searchParams);
}

export default async function PublicJobsPage({ searchParams }: PageProps) {
  const view = readBoardView(await searchParams);
  const { jobs, total } = await loadJobBoard({ ...view, q: view.search, limit: PAGE_SIZE });
  return <JobBoardView view={view} jobs={jobs} total={total} />;
}
```

Files Next requires in `src/app` (layouts, `error.tsx`, `not-found.tsx`, OG
images) stay there and import what they show from modules.

## Modules

| Module | Feature | Entry points |
|---|---|---|
| `auth` | the shell around Clerk's forms, the nav's account controls | `AuthShell`, `AuthControls` |
| `onboarding` | the job questions (`questions/`: orchestrator, steps, ui), connecting an AI (`ai/`), what both share (`shared/`) | `OnboardingFlow`, `AiSetupFlow`, the step engine, the AI connection screens · server: guard, loaders |
| `preferences` | `/dashboard/preferences`, built on onboarding's step engine | `PreferencesView` |
| `dashboard` | the shell (sidebar, top bar) and the overview | `DashboardShell`, `OverviewView` · server: access guard |
| `job-search` | matches, saved jobs, bookmarks | `MatchesView`, `SavedJobsView`, `JobRow` · server: `loadJobs` |
| `job-board` | the public `/jobs` board and job pages | views, metadata, URL reading · server: loaders |
| `talent` | the public talent directory | `TalentView` · server: `loadTalent` |
| `feedback` | the feedback form | `FeedbackView` |
| `referrals` | the referral page, claiming a referral, ways to help | `ReferralsView`, `ReferralClaim`, `Contribute` |
| `marketing` | the public site: home, about, FAQ, features, how it works, legal, support, nav, footer | one view per page, `Navigation`, `FooterSection`, `AudienceSwitch` |
| `ai-tools` | cv-review, cv-match, cv-tailor, cover-letter, interview-prep — one slice each, plus `shared/` | one view per tool |
| `applications` | the applications tracker (preview) | `ApplicationsView` |
| `settings` | the settings page (preview) | `SettingsView` |

Dependencies between modules, all through public entries: preferences and
settings → onboarding (step engine, AI screens); dashboard → job-search,
referrals; job-board → marketing (`AudienceSwitch`); marketing → auth
(`AuthControls`).

## Enforced by lint

`eslint.config.mjs` turns these rules into errors (`pnpm lint`):

- `src/app` and `src/frontend` may not import `@/backend/*`;
- outside a module, only `@/frontend/modules/<name>` and `…/<name>/server` may
  be imported — never a file inside it;
- `src/frontend/shared` may not import a module;
- `src/backend`, `src/app/api` and `src/shared` may not import `@/frontend/*`,
  and `src/shared` may not import `@/backend/*` either.

There are no exceptions. A value both sides need — the auth switch
(`@/shared/auth`), routes, contracts — lives in `src/shared/`; anything else
the frontend needs from the backend is an API endpoint.

## Placeholder data

`shared/mocks/dashboard.ts` is the placeholder data the unbuilt dashboard
pages run on. It goes away as those features become real; don't add to it.
