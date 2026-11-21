# `src/shared/`

What the frontend and the backend both need to agree on.

**The rules:** files live in a topic folder, never the root, and they import nothing from `src/frontend` or `src/backend`,
only other files in `src/shared/`. That way each side can import them without
depending on the other.

Each folder has an `index.ts`, so imports name the folder, not the file:
`import { SIGN_IN_HREF } from "@/shared/routes"`. Safe here because nothing
in `src/shared/` is server-only — unlike `src/backend/shared/proxy/`, where a
barrel could pull server code into the proxy.

| Folder | Holds |
|---|---|
| `contracts/` | The shape of every API request and response (one file per API area). |
| `errors/` | Error codes and the one message each shows, on both sides. |
| `onboarding/` | The onboarding step rules, which the browser and the backend both run. |
| `preferences/` | The search rules applied to preferences, on both sides. |
| `referral/` | The referral cookie's name. |
| `countries/` | The generated MENA country list (`scripts/countries/generate-countries.ts` writes it). |
| `routes/` | The app's page URLs. |

Server-only code — secrets, database clients, request headers — never goes
here; that's `src/backend/shared/`.
