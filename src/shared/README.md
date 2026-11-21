# `src/shared/`

What the frontend and the backend both need to agree on.

**The rule:** files here import nothing from `src/frontend` or `src/backend`,
only other files in `src/shared/`. That way each side can import them without
depending on the other.

| Folder / file | Holds |
|---|---|
| `contracts/` | The shape of every API request and response (one file per API area). |
| `errors/` | Error codes and the one message each shows, on both sides. |
| `onboarding/` | The onboarding step rules, which the browser and the backend both run. |
| `preferences/` | The search rules applied to preferences, on both sides. |
| `referral/` | The referral cookie's name. |
| `countries.ts` | The generated MENA country list (`scripts/countries/generate-countries.ts`). |
| `routes.ts` | The app's page URLs. |

Server-only code — secrets, database clients, request headers — never goes
here; that's `src/backend/shared/`.
