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
  `_lib/` folders. Everything that calls the backend lives together in
  `src/frontend/lib/api/`:
  - `server-fetch.ts`: the one fetch every server-side call goes through;
  - `guards/`: decide whether a page may render (redirects, retry screen);
  - `loaders/`: fetch a page's data and shape it into the component's props
    (e.g. sample data as a fallback).

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

## 1. On the server: `serverFetch`

`src/frontend/lib/api/server-fetch.ts`. Server-only.

```ts
import { serverFetch } from "@/frontend/lib/api/server-fetch";
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

Real examples: `src/frontend/lib/api/guards/dashboard-access.ts`,
`guards/onboarding-access.ts`, `loaders/jobs.ts` and `loaders/onboarding.ts`.

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
// src/frontend/components/.../account-card.tsx
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
`src/frontend/providers/`, inside `RootProvider`).

`clientFetch<T>(path, options)` lives in `src/frontend/lib/api/client-fetch.ts`.
It mirrors `serverFetch`: same result kinds (both use `fetch-result.ts`) and
same options. It calls the API on the same origin with the browser's own
cookies, or `NEXT_PUBLIC_API_BASE_URL` when the backend moves elsewhere. Its
own file keeps server-only code like `next/headers` out of the browser bundle.

Real example: the onboarding submit,
`src/frontend/hooks/api/use-save-onboarding.ts`
(`useMutation` → `POST /api/v1/onboarding`).

Both shapes, from the real hooks in `src/frontend/hooks/api/`:

```tsx
"use client";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";

// Read — use-job-title-search.ts: keyed by the API path and its parameters.
// Debounce the input first (useDebouncedValue, in hooks/ui/).
export function useJobTitleSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: [JOB_TITLES_API_PATH, q],
    queryFn: async () => {
      const result = await clientFetch<JobTitleMatch[]>(`${JOB_TITLES_API_PATH}?q=${encodeURIComponent(q)}`);
      if (result.kind === "ok") return result.data;
      throw ApiError.from(result);            // shared code + message
    },
    enabled: q.length >= MIN_QUERY_LENGTH,
    placeholderData: keepPreviousData,        // keep the last results while the next load
  });
}

// Write — use-save-preferences.ts.
export function useSavePreferences() {
  return useMutation({
    mutationFn: async (draft: JobPreferences) => {
      const result = await clientFetch<PreferencesSaveResult>(PREFERENCES_API_PATH, { method: "PUT", body: draft });
      if (result.kind === "ok") return result.data;
      throw ApiError.from(result);
    },
  });
}
```

Conventions:
- **Query keys** start with the API path, then its parameters, so it's obvious
  what to invalidate after a write.
- **Writes** go through `useMutation`, never a bare `clientFetch` in an event
  handler. That keeps the loading and error state and the invalidation in one
  place.
- **Errors:** a failed result carries the shared error `code` and its
  `message` (`src/shared/errors/error-codes.ts`). Hooks throw
  `ApiError.from(result)` (`src/frontend/lib/api/api-error.ts`); screens show
  `error.message`, never their own wording.
- **`unauthorized`** in the browser means the session ended: send the user to
  sign in. **`failed`** shows the error with a retry.
