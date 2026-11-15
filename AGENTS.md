<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Data fetching (project rule)

The frontend (`src/app` pages and layouts, `src/frontend`) never imports `src/backend`. It reaches the backend over HTTP only, and every response shape is a contract in `src/shared/contracts/`. Full guide with examples: `docs/frontend/DATA_FETCHING.md`.

| The fetch runs… | Use |
|---|---|
| on the server: page, layout, guard | `serverFetch<T>(path)` from `src/frontend/lib/api/server-fetch.ts` |
| in a client component, data needed on first render | start it on the server with `serverFetch`, pass the **promise** as a prop, read it with React's `use()` inside `<Suspense>` |
| in a client component, started in the browser: search, refetch, polling, saving | TanStack Query: `useQuery` / `useMutation`, with `clientFetch<T>(path)` as the function |

Never:
- `fetch` inside `useEffect` to load data;
- calling `fetch` directly instead of `serverFetch` or `clientFetch`;
- importing from `src/backend` in frontend code.

TanStack Query and `clientFetch` aren't set up yet. Add them with the first client-side fetch (see the guide).
