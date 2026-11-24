# Data fetching

How the frontend gets data from the backend. The short version of this guide
is the "Data fetching" rule in [`AGENTS.md`](../../AGENTS.md).

## The boundary

The frontend (`src/app` pages and layouts, and everything in `src/frontend`)
**never imports `src/backend`**. It calls the backend over HTTP, the same way it
would call a backend written in any other language. That way, moving the
backend to another service or technology doesn't touch the frontend.

- **API routes** in `src/app/api/` are thin: they call a backend module in
  `src/backend/modules/*` and return JSON.
- **Every response shape** is a contract in `src/shared/contracts/` (e.g.
  `account.ts` for `GET /api/v1/me`). Both sides import it; neither imports the
  other.
- **`src/app/` holds only UI (pages, layouts) and API routes**, with no
  `_lib/` folders. How the backend is reached lives in
  `src/frontend/shared/api/` (`serverFetch`, `clientFetch`, `ApiError`, the
  query setup); what each endpoint is belongs to the module that calls it
  (see [`ARCHITECTURE.md`](ARCHITECTURE.md)):
  - `modules/<name>/api/`: the endpoint functions and their query / mutation hooks;
  - guards (decide whether a page may render: redirects, retry screen) and
    loaders (fetch a page's data and shape it into props, e.g. sample data as a
    fallback) — `api/<name>.guard.ts` and `api/<name>.loader.ts`, exported
    from the module's `server.ts`.

## Which tool, where

| The fetch runs… | Use | Why |
|---|---|---|
| on the server: page, layout, guard | `serverFetch<T>(path)` | The default. Data arrives with the HTML, no loading state. |
| in a client component, data needed on first render | `serverFetch` on the server, the **promise** passed down, read with `use()` | The server starts it early; the client component streams in when it's ready. |
| in a client component, started in the browser | TanStack Query + `clientFetch<T>(path)` | Search-as-you-type, refetch, polling, saving a form: things only the browser knows to start. |

Not allowed:
- **`fetch` in `useEffect` to load data.** You'd have to handle race
  conditions, aborts and React's double run in development yourself, with no
  cache or de-duplication. React's docs advise against it, and Next 16's docs
  only list `use()` and libraries for client components.
- **Calling `fetch` directly.** The two helpers are the only places that know
  where the backend is and how auth reaches it.
- **Importing from `src/backend`** in frontend code.

### The one exception: a third-party API with the user's own key

Some features run entirely in the user's browser against a third-party
API, with a key the user keeps on their device. Jobak's server never sees
that key or the results. Today that's Apify, for job collection
([`docs/features/JOB_COLLECTION.md`](../features/JOB_COLLECTION.md)), and LiveKit, for
interview practice ([`docs/ai-tools/INTERVIEW_PRACTICE.md`](../ai-tools/INTERVIEW_PRACTICE.md)).
LiveKit is reached only through its SDK (`livekit-client`), so there is no
client file of ours that calls `fetch` for it.

`clientFetch` can't serve these: it knows Jobak's base URL, cookies and
error codes. So such an API gets **one client file in its module** that
may call `fetch`, to that API's origin only:
`src/frontend/modules/job-collection/lib/apify-client.ts` calls
`https://api.apify.com/v2/` and nothing else.

The rest of the rules still apply:
- its calls run through TanStack Query (`useGenericQuery` /
  `useGenericMutation`), never `fetch` in `useEffect`;
- the key travels in a header, never a URL, and is never logged;
- screens word errors themselves from the client's error kinds. These
  aren't Jobak API errors, so `error-codes.ts` doesn't cover them.

## 1. On the server: `serverFetch`

`src/frontend/shared/api/server-fetch.ts`, imported from its server-only
entry, `@/frontend/shared/api/server`.

```ts
import { serverFetch } from "@/frontend/shared/api/server";
import { ACCOUNT_API_PATH, type AccountStatus } from "@/shared/contracts/account";

const result = await serverFetch<AccountStatus>(ACCOUNT_API_PATH);

switch (result.kind) {
  case "ok":           // result.data is an AccountStatus
  case "unauthorized": // 401: nobody is signed in
  case "failed":       // anything else: show a retry, never treat it as signed out
}
```

What it does for every call:
- **Calls** `API_BASE_URL` when set, otherwise this app's own origin.
- **Forwards** the visitor's `cookie` header, which is how the backend knows
  the user.
- **Never caches**, since answers are per user.

For writes, pass a method and a body: `serverFetch<T>(path, { method: "POST", body })`.

Real examples, all in `src/frontend/modules/`: `dashboard/api/dashboard-access.guard.ts`,
`onboarding/api/onboarding-access.guard.ts`, `job-search/api/job-search.loader.ts`,
`job-board/api/job-board.loader.ts`, `onboarding/api/onboarding.loader.ts` and
`talent/api/talent.loader.ts`.

## 2. Server data in a client component: `use()`

When a client component needs data on first render, start the fetch on the
server and pass the promise down. Don't `await` it, so the page isn't held up:

```tsx
// src/app/(protected)/dashboard/some-page/page.tsx (server component)
import { Suspense } from "react";

export default function Page() {
  const account = serverFetch<AccountStatus>(ACCOUNT_API_PATH); // no await
  return (
    <Suspense fallback={<Skeleton />}>
      <AccountCard account={account} />
    </Suspense>
  );
}
```

```tsx
// src/frontend/modules/<name>/components/account-card.tsx
"use client";
import { use } from "react";

export function AccountCard({ account }: { account: Promise<ServerFetchResult<AccountStatus>> }) {
  const result = use(account);
  if (result.kind !== "ok") return <LoadFailed />;
  return <p>{result.data.user.fullName}</p>;
}
```

The promise must be created in a server component, because `serverFetch` is
server-only. Its result is plain JSON, so React can pass it to the client.

## 3. Started in the browser: TanStack Query

TanStack Query is set up for the whole app (`QueryProvider` in
`src/frontend/shared/providers/`, inside `RootProvider`).

`clientFetch<T>(path, options)` lives in `src/frontend/shared/api/client-fetch.ts`
(imported from `@/frontend/shared/api`).
It mirrors `serverFetch`: same result kinds (both use `fetch-result.ts`) and
same options. It calls the API on the same origin with the browser's own
cookies, or `NEXT_PUBLIC_API_BASE_URL` when the backend moves elsewhere. Its
own file keeps server-only code like `next/headers` out of the browser bundle.

Real example: the feedback form, `src/frontend/modules/feedback/api/`
(`useSendFeedback`: `useMutation` → `POST /api/v1/feedback`).

Each module keeps its endpoints in its own `api/` folder; the shared setup is
`src/frontend/shared/api/`:

```
frontend/shared/api/
├── index.ts           clientFetch, ApiError, unwrap, useGenericQuery, useGenericMutation, queryClientConfig
├── server.ts          serverFetch (server-only entry)
└── client-fetch.ts · server-fetch.ts · fetch-result.ts · api-error.ts · query-config.ts

frontend/modules/<name>/api/
├── <name>.api.ts        plain async functions, one per endpoint
├── <name>.queries.ts    useQuery hooks on them
└── <name>.mutations.ts  useMutation hooks on them
```

From the real onboarding and preferences modules:

```tsx
// onboarding/api/job-catalogue.api.ts — a plain function: one endpoint, data or a thrown ApiError.
export async function searchJobTitles(q: string, field: string | null) {
  const params = new URLSearchParams({ q });
  if (field) params.set("field", field);
  return unwrap(await clientFetch<JobTitleMatch[]>(`${JOB_TITLES_API_PATH}?${params}`));
}

// onboarding/api/job-catalogue.queries.ts — the hook, keyed by the API path and its parameters.
export function useJobTitleSearch(query: string, field?: string | null) {
  const q = query.trim();
  return useGenericQuery(jobTitleSearchKey(q, field ?? null), () => searchJobTitles(q, field ?? null), {
    enabled: q.length >= MIN_QUERY_LENGTH,
    placeholderData: keepPreviousData,
  });
}

// preferences/api/preferences.mutations.ts — invalidateKeys refreshes what a save made stale.
export const useSavePreferences = () => useGenericMutation({ mutationFn: savePreferences });
```

Conventions:
- **Query keys** start with the API path, then its parameters, so it's obvious
  what to invalidate after a write.
- **Writes** go through `useMutation`, never a bare `clientFetch` in an event
  handler. That keeps the loading and error state and the invalidation in one
  place.
- **Errors:** a failed result carries the shared error `code` and its
  `message` (`src/shared/errors/error-codes.ts`). Hooks throw
  `ApiError.from(result)` via `unwrap()` (`@/frontend/shared/api`); screens show
  `error.message`, never their own wording.
- **`unauthorized`** in the browser means the session ended: send the user to
  sign in. **`failed`** shows the error with a retry.
