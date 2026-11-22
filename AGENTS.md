<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Data fetching (project rule)

The frontend (`src/app` pages and layouts, `src/frontend`) never imports `src/backend`. It reaches the backend over HTTP only, and every response shape is a contract in `src/shared/contracts/`. Full guide with examples: `docs/frontend/DATA_FETCHING.md`.

| The fetch runs… | Use |
|---|---|
| on the server: page, layout, guard | `serverFetch<T>(path)` from `@/frontend/shared/api/server` |
| in a client component, data needed on first render | start it on the server with `serverFetch`, pass the **promise** as a prop, read it with React's `use()` inside `<Suspense>` |
| in a client component, started in the browser: search, refetch, polling, saving | TanStack Query: `useQuery` / `useMutation`, with `clientFetch<T>(path)` as the function |

Never:
- `fetch` inside `useEffect` to load data;
- calling `fetch` directly instead of `serverFetch` or `clientFetch`;
- importing from `src/backend` in frontend code.

TanStack Query is set up (`QueryProvider` in `src/frontend/shared/providers/`, defaults in `src/frontend/shared/api/query-config.ts`). `clientFetch`, `unwrap`, `useGenericQuery` / `useGenericMutation` and `ApiError` come from `@/frontend/shared/api`; `serverFetch` from `@/frontend/shared/api/server` (server-only, so it has its own entry).

A module's endpoints live in its `api/` folder (e.g. `modules/feedback/api/`):

- `<name>.api.ts` — plain async functions that call one endpoint each (`sendFeedback`), returning through `unwrap()` so a failure is a thrown `ApiError`;
- `<name>.queries.ts` / `<name>.mutations.ts` — the `useQuery` / `useMutation` hooks built on them, using `useGenericQuery` / `useGenericMutation`.

Types are the shared contracts (`src/shared/contracts/`), never redefined on the frontend.

## Frontend modules (project rule)

The frontend is a modular monolith of **vertical slices**, like the backend. Full guide: `docs/frontend/ARCHITECTURE.md`; reference module: `src/frontend/modules/feedback/`.

- `src/frontend/modules/<name>/` — one feature, everything it needs together: `api/`, `components/`, `hooks/`, `lib/`, `types/`, `config/`, `views/` (only the folders it uses).
- `src/frontend/shared/` — what is genuinely reused and belongs to no feature: `api/`, `ui/`, `components/`, `hooks/`, `lib/`, `config/`, `providers/`, `styles/`. Something used by one feature stays in that feature, even if it might be reused one day.
- `src/app/` decides **where** a feature is reachable: a page is metadata + guard → loader → a module's view.
- A module has two entries: `index.ts` (client-safe: views, components, hooks, types other code may use) and `server.ts` (loaders and guards, `import "server-only"`). Export only what others need.

Imports:
- module → `@/frontend/shared/*`: yes;
- module → another module: only `@/frontend/modules/<name>` or `@/frontend/modules/<name>/server`, never a file inside it;
- inside a module: relative imports;
- `shared` → any module: never.

`pnpm lint` enforces these and the no-`src/backend` rule (`eslint.config.mjs`), with no exceptions. Something both sides need that isn't data (e.g. the auth switch, `@/shared/auth`) goes in `src/shared/`; data comes from an API endpoint.

## API routes (project rule)

Every route handler in `src/app/api/` is wrapped in `withMiddlewares` (`src/backend/shared/http/middlewares/with-middlewares.ts`). Full guide: `docs/backend/API.md`.

```ts
export const PUT = withMiddlewares(
  { label: "preferences.update", auth: "required", body: jobPreferenceSchema },
  async ({ user, body }) => getPreferencesModule().update.execute(user.id, body),
);
```

- Inputs (`body`, `query`, `params`) are validated with **Zod** schemas, one per file in the module's `validation/` folder, named after the schema (`modules/preferences/validation/job-preference-schema.ts`), tied to the shared contract with `satisfies z.ZodType<…>`.
- To fail on purpose, **throw** an exception from `src/backend/shared/exceptions/` (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, …) — from a route, a use case or a repository. The error handler answers `{ error, code, detail? }` with its status; anything unexpected becomes a logged 503.
- Rate limits are named policies, one per integration, in `src/backend/shared/rate-limit/policies.ts`: a route opts in with `rateLimit: "<name>"`; code calling an outside service runs `enforceRateLimit("<name>", key)` first. Never a hand-rolled counter. Guide: `docs/backend/RATE_LIMIT.md`.
- Never in a route: a hand-written `try/catch`, auth check, `request.json()` or content-type check.
- Route handlers stay thin: the work is a module's use case — including integrations (the Clerk webhook's logic lives in the auth module). In a module, split the repository (database calls) from the use case, unless it's trivial.

## Errors (project rule)

Error codes and the messages users read live in one place, `src/shared/errors/error-codes.ts`, shared by both sides. The backend's exceptions carry a code; the frontend reads it (`serverFetch` / `clientFetch`), throws `ApiError` (`@/frontend/shared/api`) from the `<name>.api.ts` functions, and shows `error.message` — never its own wording for an API error.

## Components (project rule)

A component with real logic is split into a folder: a `use-<name>.ts` hook for state and actions, a file for pure helpers, and one component per screen region (see `src/frontend/modules/feedback/` or `src/frontend/modules/preferences/`: `components/`, `hooks/use-<name>.ts`, `lib/`).
