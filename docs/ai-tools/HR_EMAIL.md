# Email to HR

`/dashboard/hr-email` writes one email to HR, a recruiter or a hiring
manager with the user's own AI: short, natural, and built only from their own
facts. It follows the HR email skill
([jobak-net/career-agent-skills](https://github.com/jobak-net/career-agent-skills),
`email-hr/`). Jobak never sends the email: the user copies it, or opens it in
their own mail app.

It is built from the same pieces as the other AI tools:
- the AI factory ([AI_PROVIDERS.md](../backend/AI_PROVIDERS.md));
- the saved name and CVs ([CV_REVIEW.md](CV_REVIEW.md#saved-cvs-and-name));
- the planted-text check ([COVER_LETTER.md](COVER_LETTER.md#planted-text-in-job-postings)).

## What the user does

1. Picks **what the email is for**. Each purpose shows only the fields it
   needs (`hr-email/lib/purposes.ts`):

   | Purpose | Asks for |
   |---|---|
   | Apply for a job | company, position, the posting (optional), a saved CV to draw on |
   | Follow up | company, position, what you're following up on |
   | Reply to HR | **their message** (required), your answers |
   | About an interview | their invitation (optional), confirm, reschedule or ask |
   | Thank you after an interview | company, position, a point you discussed |
   | Salary or offer | the offer and **what you'd like to ask** (required) |
   | Reach out to a recruiter | company, position, the posting, a saved CV |
   | Ask for a referral | company, position, the posting, a saved CV, how you know them |
   | After a rejection | their message (optional), feedback or other roles |
   | Improve my draft | **your draft** (required), what to change |

2. Checks **their name**: the one saved for applications, else the
   account's. Changing it and writing saves it for next time. Optionally
   adds the recipient's name and email address. The address is only used
   for "Open in email app"; the AI never sees it and never invents one.
3. Writes **what to say** (optional for most purposes): dates, a salary
   figure, a point from the interview. Dates, figures and names come only
   from here.
4. Picks a **tone**: short and direct, friendly (the default), or formal, the
   skill's three versions.
5. Presses **Write the email**, picks a saved key, and gets:
   - the subject and the email, both editable;
   - **Copy all** (subject included), **Copy body**, and **Open in email
     app**, a `mailto:` link to the user's own mail app with the subject and
     body filled in;
   - **before you send it**: what to check or add ("Notice period not
     provided"), and a reminder to attach the CV themselves;
   - warnings: phrasing that reads as generated (live, as they edit), planted
     words, and skills the email claims that their material doesn't name.

**Use in your own AI** opens the HR email skill, as on the other tools.

## The API

`POST /api/v1/ai-tools/hr-email`, contract `src/shared/contracts/hr-email.ts`,
rate limit `ai-tools.hr-email` (10 a minute per user).

```ts
// request
{
  provider: "groq", purpose: "reply", tone: "friendly",
  sender: { name: "Omar Khaled" },
  recipient: { name: "Mariam", email: "" },               // both optional
  job: { company: "Khazna", title: "Back End Developer", posting: "" },
  context: { theirMessage: "…", draft: "", notes: "Expected salary around 35,000 EGP" },
  cv: { text: "…", source: "pdf", pages: 1 },              // optional
}
// 200
{ subject, body, notes, provider, model, styleFlags, postingFindings, plantedWordsInEmail, unsupportedSkills }
```

A 400 for a field out of bounds, an invalid address, or a purpose missing
what it needs (`hrEmailSchema`'s `superRefine`):
- a reply needs their message;
- improving needs the draft;
- an offer email needs notes or their message.

The other statuses are the AI tools' usual ones (409, 422, 429, 503).

## How it works

`WriteHrEmailUseCase`:
1. **The facts.** The chosen CV, or else the profile's target roles, skills
   and level, read on the server. Without a CV the email says less, never
   more.
2. **Pasted text someone else wrote.** The posting and HR's message are
   scanned (`scanJobPosting`): invisible text stripped, words planted for AI
   tools forbidden in the prompt and checked after.
3. **One call** at medium reasoning (up to 2,000 tokens, sized by
   `replyCeiling`). A reply that thinks through its ceiling is retried once
   at low reasoning; a throttled call is retried once.
4. **The reply** comes as plain text in `=== SUBJECT / EMAIL / NOTES ===`
   sections (`readHrEmailReply`):
   - typography is normalised;
   - em dashes become plain punctuation;
   - a `[Placeholder]` the model left in is kept in the email, so the user
     sees it, and added to the notes ("Fill in [Start Date] before sending").
5. **Checks:**
   - phrasing that reads as generated (`findAiTells`);
   - planted words that reached the email;
   - **skills the email claims that the user's material never names**
     (`skillsNotIn`, `ai-tools/shared/domain/claims.ts`, shared with CV
     tailoring).

The prompt (`hr-email-prompt.ts`) carries the skill's rules:
- one purpose per email, with its length and usual tone from the skill's
  tables (an application 80–150 words, a follow-up 40–100…);
- the purpose in the first sentence, and a clear subject;
- the recipient by name only when given, otherwise "Dear Hiring Team,";
- none of the template phrases the skill names ("I hope this email finds you
  well", "Please do not hesitate…");
- no flattery, desperation, exclamation marks or emojis;
- clear, simple English, or the language of the material;
- never a date, an amount, a name, a connection or a skill the user didn't
  give. A missing detail goes under NOTES, never a placeholder.

## Testing

Live on Groq GPT-OSS 120B, 2026-11-24, each call 2–2.6 s:
- **An application**, with a posting and a CV: 107 words, a clear subject,
  the CV attached in one line. That first run claimed "PostgreSQL" (from the
  posting, not the CV), which is why the prompt now forbids posting-only
  skills and `skillsNotIn` flags them.
- **A reply to HR asking for salary and notice period**, with notes giving
  only the salary: it answered the salary, didn't invent a notice period,
  and listed it under notes.
- **A follow-up with no date given**: no date was invented.

Offline (`tsx`):
- `skillsNotIn` flags the live run's "PostgreSQL" and an added "CI/CD" or
  "NestJS", and leaves the CV's own skills, "CV", "HR" and names alone;
- the reader handles slots, em dashes, a "Subject:" prefix and a reply with
  no sections;
- the schema enforces each purpose's requirement and the address format.
