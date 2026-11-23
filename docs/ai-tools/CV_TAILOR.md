# CV tailoring

`/dashboard/cv-tailor` shows how the user's CV fits one job, requirement by
requirement. Then it writes a version of the CV for that role with their own
AI, without inventing anything. It follows the CV tailoring skill
([jobak-net/career-agent-skills](https://github.com/jobak-net/career-agent-skills),
`cv-tailor/`): analyse the job before rewriting, tailor the positioning and
never the history, and keep gaps visible.

It is built from the same pieces as the other AI tools:
- the CV input, saved CVs and file reading in the browser, from
  [CV_REVIEW.md](CV_REVIEW.md);
- the posting check for planted text, from [COVER_LETTER.md](COVER_LETTER.md);
- the AI factory ([AI_PROVIDERS.md](../backend/AI_PROVIDERS.md)).

## What the user does

1. Opens the page. Without a saved AI key it's locked behind `AiToolGate`.
2. Pastes the **job posting**. It's checked as they paste for text planted for
   AI tools (`PostingCheck`). The **company** and **job title** are optional:
   the posting usually names them, and they go into the prompt and the file
   name.
3. Adds the **CV**: saved (the default when they have one), uploaded (PDF or
   Word, read in the browser, at most 2 pages), or pasted. The text the AI
   reads is shown and editable. A new CV is saved for next time when the
   analysis runs.
4. Presses **Analyse the match**, picks a saved key and confirms. Gets:
   - the match score and its rating, with a truthful headline to present
     themselves with;
   - the score by category;
   - where they fit and what's missing;
   - **what the job asks for**: each requirement with its priority and type
     (essential, important, preferred, implied) and how the CV meets it
     (shown, partly, transferable, missing). The CV's own words are quoted as
     evidence, checked on the server.
5. Presses **Write the tailored CV** (same provider, no popup). Gets:
   - the scores before and after;
   - what changed;
   - what's still missing (left out of the CV, not covered up);
   - the posting's terms the CV now uses, and recommendations beyond the CV;
   - the tailored CV, editable, with Copy, PDF and Word.

   Numbers the original doesn't state, words the posting planted, and wording
   that reads as generated are flagged live as they edit.

**Use in your own AI** in the header opens the CV tailoring skill with its
version dropdown, Copy and Download, like the other tools.

## How it flows

```mermaid
sequenceDiagram
    participant B as Browser
    participant R as Route (withMiddlewares)
    participant U as AnalyzeCvFitUseCase / TailorCvUseCase
    participant AI as User's AI provider

    B->>B: scanJobPosting (live) · CV from saved / file / paste
    B->>R: POST /cv-tailor/analyze { provider, cv, job }
    U->>U: scanJobPosting: cleaned posting, planted words forbidden
    U->>AI: analysis prompt (JSON reply, medium reasoning)
    AI-->>U: scores, requirements, strengths, gaps
    U->>U: clamp and sum the scores, check every evidence quote
    U-->>B: CvFitResponse (+ postingFindings)
    B->>R: POST /cv-tailor { provider, cv, job, focus, originalScores }
    U->>AI: tailor prompt (plain-text sections)
    AI-->>U: tailored CV, changes, keywords, gaps, recommendations, scores
    U->>U: contact details put back; numbers, keywords, planted words checked
    U-->>B: CvTailorResponse
```

The server keeps nothing between the two requests. The page sends back:
- the analysed CV and job;
- what the analysis found (`focus`: the positioning, and each requirement
  with how the CV meets it);
- its scores, as the baseline.

## Code map

```
src/shared/contracts/cv-tailor.ts       both endpoints, FIT_CATEGORIES (the rubric), limits, requirement kinds

src/backend/modules/ai-tools/
├── shared/domain/cv-writing.ts         the rules every rewritten CV follows (shared with CV review)
├── shared/domain/reply-parsing.ts      extractJson, readScores, sections, tidyCvText… (shared)
└── cv-tailor/
    ├── application/analyze-cv-fit.use-case.ts
    ├── application/tailor-cv.use-case.ts
    ├── domain/cv-tailor-prompt.ts      both prompts, readFitReply, readTailorReply, keywordsNotIn
    └── validation/                     tailor-job-schema, cv-fit-schema, cv-tailor-schema

src/app/api/v1/(ai-tools)/ai-tools/cv-tailor/analyze/route.ts   POST analyze
src/app/api/v1/(ai-tools)/ai-tools/cv-tailor/route.ts           POST tailor

src/frontend/modules/ai-tools/
├── shared/   hooks/use-cv-input.ts, components/cv-input.tsx (the CV, every tool),
│             components/cv-editor.tsx, score-comparison.tsx, posting-check.tsx
└── cv-tailor/
    ├── api/            cv-tailor.api, cv-tailor.mutations, cv-tailor.loader
    ├── hooks/use-cv-tailor.ts
    ├── components/     cv-tailor-tool, cv-tailor-form, fit-overview, requirements-list, tailored-cv
    └── views/cv-tailor-view.tsx
```

## The API

Contract: `src/shared/contracts/cv-tailor.ts`. Both endpoints need a signed-in
user and share one rate limit (`ai-tools.cv-tailor`, 6 a minute per user).

```ts
// POST /api/v1/ai-tools/cv-tailor/analyze
{ provider: "groq", cv: { text: "…", source: "pdf", pages: 1 }, job: { company: "", title: "", description: "…" } }
// → { score: 45, rating: "mismatch", categories: [{ id, label, score, max, feedback }×6],
//     summary, positioning,
//     requirements: [{ requirement, priority, type, match, evidence | null, note }],
//     strengths, gaps, postingFindings, provider, model }

// POST /api/v1/ai-tools/cv-tailor
{ provider, cv, job, focus: ["…"], originalScores: { technical: 12, … } }
// → { cv, changes, keywords, gaps, recommendations, score, categories,
//     unsupportedNumbers, unsupportedKeywords, plantedWordsInCv, provider, model }
```

| Status | Code | When |
|---|---|---|
| 400 | `validation` | CV under 200 or over 10,000 characters or over 2 pages, posting under 80 or over 8,000 characters, a bad provider |
| 409 | `ai-not-connected` | no saved key for that provider |
| 422 | `ai-key-rejected` / `ai-model-unavailable` | the provider refused the key, or retired the model |
| 429 | `rate-limited` / `ai-provider-limited` | our limit, or the provider's (retried once when it asks to wait 20 s or less) |
| 503 | `service-unavailable` | the provider failed, or the reply had no usable analysis or CV |

The posting limit is 8,000 characters, lower than the cover letter's 12,000.
The CV goes in the same request, and both must fit a free tier's per-minute
token limit.

## The match

The skill's rubric (`FIT_CATEGORIES`):

| Category | Max |
|---|---:|
| Technical skills | 30 |
| Relevant experience | 25 |
| Responsibilities | 20 |
| Required qualifications | 15 |
| Industry and domain | 5 |
| Preferred qualifications | 5 |

Ratings follow the skill's ranges (`fitRatingFor`), from "Excellent match"
(90+) to "Significant mismatch" (under 50).

`readFitReply`:
- clamps the scores and sums them;
- keeps up to 16 requirements, most important first;
- looks each evidence quote up in the CV (`findQuote`). One that isn't there
  becomes null, so the page only quotes the CV's real words.

The page says the score is an estimate, not an ATS score or a hiring
probability.

## The tailored CV

The rules shared with CV review's improved CV (`shared/domain/cv-writing.ts`),
each from a live run that broke it:
- keep every employer, title, date and link;
- contact details character for character;
- no total years, no added detail in a bullet, no placeholders;
- plain language and an ATS-friendly layout.

CV tailoring adds the skill's own rules:
- never change a past title to match the role, and never add a technology
  because the posting asks for it;
- use the posting's terms only where the CV supports them, without keyword
  stuffing;
- tailor by emphasis and order (headline, summary, skills, bullets), and keep
  every past job and the chronology;
- **rewrite weak bullets**, keeping their facts. A live run that only
  reordered passed "Responsible for developing…", "Helped with bug fixes" and
  "Spearheaded" through unchanged;
- keep direct experience and transferable skills apart;
- gaps go under "Still missing", never into the CV.

The re-score starts from the analysis's scores. Clearer evidence of real
experience can raise a category; a gap that's still a gap can't. A tailored
CV that scores lower is said to be so (`ScoreComparison`).

After the reply:
- the original's contact details are put back (`restoreContactDetails`);
- the server lists numbers the original doesn't state, keywords the original
  never mentions (`keywordsNotIn`: possibly a skill claimed for the job's
  sake), and planted words that reached the CV;
- the page shows keywords the original lacks with a red dot and a warning.

## The CV as a file

The tailored CV, and CV review's improved CV, are saved as PDF or Word in one
simple design, modelled on a reference CV and kept ATS-friendly:
- one column of real text;
- the name large and bold, the headline in spaced capitals, bold contact
  lines;
- standard section headings with a thin rule under each;
- each job or project as "Company | Title" in bold, with the dates
  right-aligned;
- round bullets.

There are no tables, columns, icons or graphics: those are what ATS parsers
trip on.

| File | How |
|---|---|
| PDF | jsPDF, Helvetica, A4 with 18 mm sides; the dates drawn right-aligned. Text comes out in reading order ("DBInvesting \| Software Engineer 11/2025 – Present"), which is what an ATS extracts. A non-Latin CV goes through the browser's "Save as PDF" with the same design in HTML |
| Word | docx, Arial; the dates on a right tab stop (not a table), the bullets a real bullet list (Word's numbering, not typed "•"), the headings a paragraph border |
| Preview | the editor's **Preview** tab: the same HTML the print path uses, in a sandboxed frame, so what's shown is the file's design |

All three draw from one reading of the CV's text (`parseCv`,
`ai-tools/shared/lib/cv-layout.ts`):
- the header: the name, then a headline, then contact lines;
- headings, known by name, or a short all-capitals line after the header;
- entries: a line ending in dates, a line followed by bullets, or a date on
  its own line, which joins the entry above;
- bullets; anything else stays a paragraph, never dropped.

To fit the design, the prompts ask for this layout: name, headline, contact
lines, then "Company | Title | dates" for each entry. The reader also
handles the older shape, with dates on their own line.

Code: `cv-layout.ts` (the parser and the HTML), `export-cv.ts` (PDF, Word,
print), `use-document-export.ts` (`"cv"` layout), `cv-editor.tsx` (Edit /
Preview).

## Free-tier limits

As for CV review:
- `replyCeiling` sizes each request's ceiling to its input: analysis up to
  3,500, tailoring up to 4,000;
- a reply that thinks through its ceiling is retried once at low reasoning;
- a throttled call is retried once;
- the analysis and the tailored CV are separate requests, and the page notes
  that a free tier may need a minute between them.

Measured on GPT-OSS 120B, 2026-11-24, with a one-page CV and a 1,300-character
posting:
- analysis: about 1,360 tokens in, 2,370 out;
- tailoring: about 2,130 tokens in, 1,300 out.

## Testing

Checked live on Groq GPT-OSS 120B, with a frontend CV against a back-end
posting (a deliberate stretch):
- the analysis scored 45 ("Significant mismatch"), with 12 requirements
  classified and the CV's real words as evidence;
- the gaps were listed plainly;
- the tailored CV kept every title and date and invented no number or
  keyword. It raised the score to 50 by emphasis, and left the back-end gaps
  as gaps.

The shared readers and checks are covered by the CV review tests (see
[CV_REVIEW.md](CV_REVIEW.md#testing)).
