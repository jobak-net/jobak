# 🧠 AI Job Finder Platform

An AI-powered job-matching platform that helps users find highly relevant job opportunities based on their preferences (remote/on-site, location, field, skills, etc.). The system collects user inputs via a guided onboarding flow and triggers an automated n8n workflow to collect, filter, and recommend jobs using AI.

---

## 🎯 Objectives
- Provide personalized job recommendations.
- Support both remote and location-based jobs.
- Automate job discovery by combining AI with public job-platform APIs and feeds.
- Integrate seamlessly with external AI APIs (e.g., Grok).

---

## 🛠️ Tech Stack
- **Frontend:** React / Next.js, TailwindCSS
- **Backend:** Node.js (Express / NestJS) or Serverless
- **Automation/Workflow:** n8n
- **Database:** PostgreSQL / Supabase
- **AI Processing:** Grok API (or OpenAI fallback)

---

## 🧱 System Architecture

```text
[ Frontend (React/Next.js) ]
            ↓
[ API Layer (Backend/Serverless) ]
            ↓
[ n8n Webhook Trigger ]
            ↓
[ n8n Workflow (Collection + AI) ]
            ↓
[ Job Results Storage (DB/Cache) ]
            ↓
[ Frontend (User Dashboard) ]
```

---

## 🧑‍💻 User Flow

### 1. Sign-Up / Login
- Email/password or OAuth (Google, LinkedIn).

### 2. Onboarding (Step-by-Step Form)
- **Step 1: Work Preference** - Remote (Worldwide), On-site (Local), or Hybrid.
- **Step 2: Location** - Country, City (optional for on-site/hybrid).
- **Step 3: Job Field** - E.g., Software Engineering, Marketing, Finance, Design.
- **Step 4: Skills & Experience** - Years of experience, key skills (tags), and technologies.
- **Step 5: Job Preferences** - Full-time/Part-time/Freelance, Salary expectations, Seniority level.
- **Step 6: AI Integration** - Input field for Grok API Key OR "Connect AI" button (sends token securely to the backend).

### 3. Submit & Trigger Workflow
Upon submission, data is sent to the backend API, which triggers the n8n webhook:

```json
POST /webhook/job-search
{
  "userId": "123",
  "workPreference": "remote",
  "location": {
    "country": "Egypt",
    "city": "Cairo"
  },
  "field": "Software Engineering",
  "skills": ["JavaScript", "React", ".NET"],
  "experience": 2,
  "jobType": "Full-time",
  "seniority": "Mid",
  "apiKey": "GROK_API_KEY"
}
```

---

## ⚙️ n8n Workflow Design

1. **Trigger:** Webhook node receives user data.
2. **Processing & Validation:** Ensures required fields exist, cleans, and normalizes data.
3. **Query Builder:** Constructs search strings (e.g., `"React Developer remote"` or `"Software Engineer Cairo .NET"`).
4. **Collection Nodes:** Retrieve job title, company, location, salary, and job link from
   integrated job platforms. Prefer official/public APIs and feeds; only add a source
   after confirming its terms of service permit automated access.
5. **AI Processing (Grok / LLM):** - Filters out irrelevant jobs.
   - Ranks jobs based on skills, experience, and location match.
   - *Optional:* Generates a summary and scores jobs (0–100 relevance).
6. **Output:** ```json
{
  "jobs": [
    {
      "title": "Frontend Developer",
      "company": "Company X",
      "location": "Remote",
      "score": 92,
      "link": "https://..."
    }
  ]
}
```

---

## 🗄️ Data Storage

### `Users` Table
- `id` (PK)
- `email`
- `created_at`

### `Profiles` Table
- `user_id` (FK)
- `preferences` (JSON)
- `skills` (JSON)
- `api_key` (Encrypted string)

### `Jobs` Table
- `id` (PK)
- `user_id` (FK)
- `title`
- `company`
- `location`
- `score`
- `link`
- `created_at`

---

## 🖥️ Frontend Features
- **Dashboard:** View job recommendations list, apply filters (location, salary, type), and save/bookmark jobs.
- **Notifications:** Email or in-app alerts for new high-score matches.
- **Settings:** Update job preferences, skills, and manage API keys.

---

## 🔐 Security Considerations
- **API Keys:** Symmetrically encrypt all user API keys before storing them in the database.
- **HTTPS:** Enforce TLS/HTTPS for all frontend-to-backend and backend-to-n8n communication.
- **Rate Limiting:** Protect the webhook endpoints from spam/abuse.
- **Source Compliance:** Only integrate platforms whose terms of service permit automated access. Prefer official/public APIs, respect `robots.txt` and rate limits, and remove any source that disallows it.

---

## 🚀 Future Enhancements
- [ ] CV Upload & AI Parsing
- [ ] One-click Auto-apply feature
- [ ] AI-generated personalized cover letters
- [ ] Real-time push notifications for new job alerts
- [ ] Browser extension for quick application tracking

---

## 🏃 Running without auth

To work on the features without setting up Clerk, turn sign-in off in `.env.local`:

```bash
AUTH_ENABLED=false
```

Then `pnpm install` and `pnpm dev` as usual.

- No Clerk keys are needed. Clerk is never called.
- There is no sign-in or sign-up. Every visitor is the single **local owner**,
  who goes straight to onboarding and then the dashboard. `/login` and
  `/register` redirect to `/dashboard`, and referral links do nothing.
- The rest of `.env.local` (database, encryption secret) is still required,
  because the features need them.
- Accepted values are `false`, `0`, `no` and `off`. Leaving it unset means auth
  is **on**, and any other value stops the app with an error rather than
  guessing.
- If you build (`pnpm build`), build with the same value you run with:
  prerendered pages decide at build time whether Clerk wraps them.

> ⚠️ With auth off, anyone who can reach the server acts as the owner, with the
> owner's data and saved API keys. Only run it on localhost or behind your own
> access control (VPN, reverse-proxy auth).

How the request pipeline behaves in each mode: [`docs/backend/PROXY.md`](docs/backend/PROXY.md).

---

## 📚 Documentation

- [`docs/general/PROJECT_OVERVIEW.md`](docs/general/PROJECT_OVERVIEW.md) — architecture, tech stack, and feature-by-feature implementation notes.
- [`docs/general/PRE_PRODUCTION.md`](docs/general/PRE_PRODUCTION.md) — the pre-launch checklist: what's done, what needs config, and what's still a product decision.
- [`docs/frontend/DESIGN_SYSTEM.md`](docs/frontend/DESIGN_SYSTEM.md) — the visual language and design tokens.
- [`docs/backend/PROXY.md`](docs/backend/PROXY.md) — the request pipeline (`src/proxy.ts`): auth session, steps, and how to add one.
- [`db/README.md`](db/README.md) — database migrations, one subfolder per database.
- [`docs/general/scripts/README.md`](docs/general/scripts/README.md) — the project scripts CLI (`pnpm scripts`).

---

> **Note:** The priority for V1 is keeping the onboarding structured but simple, starting with 2-3 reliable, terms-compliant job sources before scaling, and prioritizing the *quality* of AI job matches over raw quantity.
