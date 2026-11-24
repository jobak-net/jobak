# Interview practice with LiveKit: design

Status: draft for approval, 2026-11-24. Branch `ai-tools/livekit` (from `staging` at a3f373a).

## Intent

`/dashboard/interview-prep` becomes a live voice interview. The user enters
the role, the company and the job description. An AI playing the company's
HR interviewer then calls them in the browser, asks questions, listens and
follows up, so they can practise out loud.

It runs on **the user's own LiveKit account**: not on Jobak's servers and
not on Jobak's LiveKit account. Everything happens in the user's browser.

## Goals

- **One-time setup**, done right in the page's lock card (as with Apify),
  and editable in Settings:
  - the user deploys an "interviewer" agent in LiveKit's Agent Builder, with
    instructions we give them to copy;
  - they turn on LiveKit's token server;
  - they paste two values into Jobak: the token server ID and the agent's
    name.
- **A form:** role, company, job description.
- **A voice call in the browser:**
  - start, mute, end, a timer;
  - what the interviewer is doing (joining, listening, thinking, speaking);
  - a live transcript of both sides.
- **After the call:** the transcript stays on screen, with Copy and
  Download. The interviewer closes with short spoken feedback.

## Non-goals

- Anything on Jobak's server for the call: no token endpoint, no
  transcript storage, no AI key.
- Video, or a recording of the call.
- Saving past interviews. Using the saved CV in the interview could come in
  a later version.
- Scoring the interview in Jobak. The feedback is the interviewer's spoken
  closing.
- Hosting or deploying the agent for the user. They deploy it in LiveKit
  themselves, guided by us.

## Anti-goals

- A LiveKit API secret entering Jobak's page, storage or code.
- The microphone staying on after the user ends the call or leaves the
  page.
- A call that keeps spending the user's LiveKit credit after they ended it,
  or after they left the page.

## Constraints and facts checked (2026-11-24)

- **LiveKit is the call, not the interviewer.** The interviewer is a
  LiveKit agent running on the user's LiveKit Cloud. Agent Builder deploys
  one from the browser with no code. Its instructions can use per-call
  values: Builder agents parse the job (dispatch) metadata as JSON, and
  `{{metadata.key}}` works in the instructions and the greeting. Its voice
  and AI use LiveKit Inference, billed to the user's project.
- **Tokens without a server:** LiveKit's token server is a project
  setting.
  - Turn on "Development token server" and copy its ID.
  - LiveKit says it's "for development and testing only": anyone with the
    ID can open calls on that project. The user accepted this (option 1),
    and the setup screen says it plainly.
- **SDK:** `livekit-client` 2.23.0 (2026-10-16, the newest release at least
  two weeks old). It exports:
  - `TokenSource.developmentTokenServer(id).fetch({ roomName, participantName, participantIdentity, agentName, agentMetadata })`,
    which returns `{ serverUrl, participantToken }`;
  - then `new Room().connect(serverUrl, participantToken)`.

  The SDK posts to `https://cloud-api.livekit.io/api/v2/sandbox/connection-details`
  with `X-Sandbox-ID`. CORS allows any origin (checked).
- **Transcripts:** the agent publishes them on the text stream topic
  `lk.transcription`, read with `room.registerTextStreamHandler`.
  - Interim and final pieces share `lk.segment_id`, and
    `lk.transcription_final` marks the final one. Check it as a string or a
    boolean: the docs and the typings disagree.
  - The agent's state is the participant attribute `lk.agent.state`
    (`initializing | listening | thinking | speaking | idle`).
- **Project rules:**
  - The page gets the account id and name from the dashboard guard, as Find
    jobs elsewhere does. Nothing else touches Jobak's server.
  - The data-fetching rule's exception (a third-party API from the browser
    with the user's own key) grows from "Apify" to "Apify, LiveKit". For
    LiveKit, the SDK makes the requests and our code calls no `fetch`.

## Approaches considered

1. **LiveKit's token server ID + agent name (chosen by the user).** No
   secret in Jobak's page. The token server is labelled for development.
2. **The user pastes their LiveKit API key and secret, and the page signs
   tokens in the browser.** One setting fewer, but a secret that controls
   their whole LiveKit project would sit in the browser. Rejected.
3. **A token endpoint on Jobak's server.** That's the production pattern,
   but the user wants nothing server-side. Rejected.

Whichever way the token is made, the agent has to be deployed by the user.
That isn't a choice between the approaches.

## The design

### Where it lives

The existing `ai-tools/interview-prep/` slice is rebuilt (one `ai-tools`
module, one slice per tool, as the project's modules guide says):

- `lib/livekit-settings.ts`: `{ tokenServerId, agentName }` in
  `localStorage` under `jobak.livekit.<accountId>`. Every access is guarded
  (blocked storage reads as "blocked"), the same pattern as the Apify token
  store.
- `hooks/use-livekit-settings.ts`: the same `useSyncExternalStore` pattern
  as `useApifyToken`.
  - `loading` until the browser has been read, so the setup card never
    flashes.
  - Saving checks the token server ID by asking for a token without an
    agent, which starts no agent and costs nothing. The agent name can't be
    checked without starting it; a wrong name shows when the interviewer
    never joins (see Errors).
- `lib/interview-metadata.ts`: builds the agent metadata JSON:

  ```ts
  { role, company, job_description, candidate_name }
  ```

  Each value is trimmed and capped: role 120, company 120, job description
  4,000, name 80 characters.
- `lib/interviewer-instructions.ts`: the instructions and greeting the user
  pastes into Agent Builder (below).
- `lib/transcript.ts`: a pure reducer from transcription pieces to lines
  `{ id: segmentId, speaker: "interviewer" | "you", text, final }`. An
  interim piece is replaced by its final, and lines are ordered by first
  appearance.
- `hooks/use-interview-call.ts`: wraps the `Room`.
  - Connect with mic only.
  - Map `lk.agent.state` to the status shown.
  - Feed `lk.transcription` into the reducer.
  - Mute, End, and a timer.
  - It always disconnects (mic off) on End, on unmount and on
    `pagehide`.
- `components/`: `livekit-gate.tsx` (the lock card with the setup form
  inside), `livekit-setup-form.tsx` (shared with Settings),
  `interview-form.tsx`, `call-panel.tsx`, `transcript-view.tsx`.
- `views/interview-prep-view.tsx`.
- The page `src/app/(protected)/dashboard/interview-prep/page.tsx`: the
  account guard, then the view. It **no longer uses `AiToolGate`**: this
  tool needs LiveKit, not a Jobak AI key.
- **Settings:** a tab "Interview practice" (after "Job collection") with
  the same setup form, the saved values and Remove. Deep link
  `?tab=interview-practice`.
- **Dependency:** `livekit-client@2.23.0`, pinned exactly. No
  `@livekit/components-react`: the UI is small and matches the app's own
  components.

### The setup (lock card and Settings)

```
To unlock interview practice, connect your LiveKit
It runs on your own LiveKit account, from this browser. Jobak never joins the call.

1. Turn on the token server
   Settings › General › Options › Development token server › copy the Token server ID.
   Anyone with this ID can start calls on your LiveKit account, so keep it private.
2. Create the interviewer      [Copy instructions] [Copy welcome message] [Copy variable names]
   Agents › Create agent › Create in browser using Agent Builder › 1-to-1 training.
   Conversation: our instructions and welcome message. Advanced: the agent name,
   and four String variables under Custom metadata. Deploy agent.
3. Paste both here
   [ Token server ID ]  [ Agent name ]          [ Connect ]
```

(Updated 2026-11-24 after walking through LiveKit Cloud: the token server is
under Settings › General › Options, and Agent Builder rejects
`{{metadata.*}}` variables until they're declared under Custom metadata.)

The card is one column, 680px wide:
- a collapsed "Watch the setup" row that opens a narrated video of these
  steps, with a chapter button per step (`LockedFeature`'s `guide`, filled
  with `GuideVideo`);
- then the steps as a wizard: a progress bar, one step at a time, Back and
  Next;
- step 3 holds the two fields and Connect.

No LiveKit URL is asked for. The token server's address is fixed
(`cloud-api.livekit.io`, with the ID sent as a header), and its answer
carries the project's URL. That URL is saved and shown ("Connected to
<project>.livekit.cloud", and in Settings). A URL pasted into the ID field
gets an inline hint, and Connect stays off.

These steps are a real sequence, so they're numbered. "Connect" checks the
token server ID (above), saves both values in this browser, and the page
unlocks in place.

### The interviewer's instructions (for Agent Builder)

The text is final copy, kept in `lib/interviewer-instructions.ts` and shown
with a Copy button. In short:

- **Instructions:** "You are an experienced HR interviewer at
  {{metadata.company}}, interviewing {{metadata.candidate_name}} for the
  {{metadata.role}} role. Job description: {{metadata.job_description}}."
  Then the rules:
  - one question at a time, mixing behavioural, role-specific and motivation
    questions drawn from the job description;
  - follow up on vague answers, and keep it to about 6 to 8 questions
    (about 15 minutes);
  - be professional and warm; don't coach during the interview;
  - speak the language the candidate speaks;
  - when the candidate says they're done, or after the last question, give
    2 to 3 strengths and 2 to 3 things to improve, then say goodbye;
  - never invent facts about the company beyond what's given.
- **Greeting:** "Hello {{metadata.candidate_name}}, thanks for joining. I'm
  the interviewer for the {{metadata.role}} role at {{metadata.company}}.
  Shall we begin?"

### The page

```
Interview practice
Practise out loud with an AI interviewer that runs on your own LiveKit account.

Role [ Back End Developer ]   Company [ Khazna ]
Job description [ paste the posting                              ]
                                               [ Start interview ]

── during the call ─────────────────────────────────────────────
 ● Interviewer is speaking            12:41      [ Mute ]  [ End interview ]
 Interviewer: Tell me about a project where you…
 You:         At my last job I built…
```

- **Start interview:**
  1. Ask for the microphone. If it's denied: "Allow the microphone to
     practise. Your browser asks once."
  2. Fetch the token with `roomName = interview-<random>`,
     `participantIdentity = <random>`, `participantName = <name>`,
     `agentName`, and `agentMetadata = JSON.stringify(metadata)`.
  3. Connect and publish the mic.
- **Status** comes from `lk.agent.state`: "Interviewer is joining",
  "Listening", "Thinking", "Speaking".
- **If the interviewer hasn't joined 30 s after connecting:** "The
  interviewer didn't join. Check the agent name in Settings matches the one
  in LiveKit, and that the agent is deployed." The page then disconnects.
- **End:** disconnect (the mic turns off). The transcript stays, with Copy
  and Download (`.txt`). Starting again clears it.
- The form is locked during the call.

### Errors (in the page's words)

| Problem | What the user reads |
|---|---|
| Token server ID rejected | "LiveKit didn't accept this token server ID. Check it in LiveKit › Settings." |
| Network | "LiveKit couldn't be reached. Check your connection." |
| Interviewer never joins | (above) |
| Connection drops mid-call | "The call dropped." The transcript stays, and "Start interview" can start a new call. |

## Left to the builder

- The exact layout and copy beyond the text above, and the transcript's
  auto-scroll.
- How the timer and the 30 s join timeout are implemented.

## Testing

- **Unit (node --test):**
  - the settings store (per account, blocked storage);
  - the metadata builder (trimming, caps, keys);
  - the transcript reducer (interim then final, two speakers, order);
  - the instructions text containing exactly the metadata keys the builder
    sends.
- **UI** in the isolated test browser, with a fake token source and Room:
  setup in the card, unlock in place, start, status changes, transcript,
  End and mic off, the join timeout, mic denied.
- **Live:** one real call, if the user sets up an agent and gives a token
  server ID and agent name for testing.
