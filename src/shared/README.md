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
| `ai/` | The AI provider ids (`AI_PROVIDER_IDS`): what onboarding offers and what the backend's AI factory must implement. The models a user can pick per provider, and each default (`AI_MODELS`, `AI_DEFAULT_MODELS`). |
| `ai-tools/` | The job-posting scanner (`scanJobPosting`): finds text planted for AI tools. The style check (`findAiTells`): phrasing that reads as AI-written. Both run in the browser and on the server. |
| `credentials/` | What each provider's keys look like (`keyRules`, `checkKeyFormat`): checked in the browser and again by the API. |
| `auth/` | Whether sign-in is on (`AUTH_ENABLED`) and Clerk's public key. Read on the server; the secret key stays in the backend. |
| `contracts/` | The shape of every API request and response (one file per API area). |
| `errors/` | Error codes and the one message each shows, on both sides. |
| `onboarding/` | The onboarding step rules, which the browser and the backend both run. |
| `preferences/` | The search rules applied to preferences, on both sides. |
| `referral/` | The referral cookie's name. |
| `countries/` | The generated MENA country list (`scripts/countries/generate-countries.ts` writes it). |
| `routes/` | The app's page URLs. |

Server-only code — secrets, database clients, request headers — never goes
here; that's `src/backend/shared/`.
