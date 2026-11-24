# Interview practice (LiveKit)

`/dashboard/interview-prep` is a practice interview by voice. An AI playing
the company's HR interviewer calls the user in the browser, asks questions
drawn from the job description, follows up, and closes with short spoken
feedback.

It runs on **the user's own LiveKit account**, from their browser: not on
Jobak's servers, and not on a Jobak LiveKit account.

- Design: [`docs/superpowers/specs/2026-11-24-interview-practice-livekit-design.md`](../superpowers/specs/2026-11-24-interview-practice-livekit-design.md)
- Code: `src/frontend/modules/ai-tools/interview-prep/`

## What the user does

1. **Connects their LiveKit once**, right in the locked page's card, or in
   Settings › Interview practice (`/dashboard/settings?tab=interview-practice`):
   1. **Turn on the token server.** In LiveKit Cloud, Settings › General ›
      Options › **Development token server** (off by default): turn it on and
      copy the **Token server ID**. This is not the project ID or the agent's
      ID (agent IDs start with `CA_`). LiveKit answers `400 invalid name` to
      an ID in the wrong format, and `404` to an unknown one.
   2. **Create the interviewer.** Agents › Create agent › Create in browser
      using Agent Builder, template "1-to-1 training", then:
      - Conversation: replace the instructions and the welcome message with
        ours (Copy buttons). Builder warns "Field contains unrecognized
        variables" until the Advanced bullet is done.
      - Actions: under Client tools, Add client tool `submit_evaluation`
        with our description, four required parameters (`score` integer,
        `summary`, `strengths`, `mistakes` strings; a copy button for each
        description), and Silent on. This is how the evaluation reaches the
        page (below).
      - Advanced: set the agent name (e.g. `jobak-interviewer`) and, under
        Custom metadata, add four String variables: `role`, `company`,
        `job_description`, `candidate_name` (Copy variable names).
      - Models & Voice: the default realtime model works; the voice is the
        user's choice.
      - Deploy agent, and wait for "deployment has completed".
   3. **Paste the token server ID and the agent name**, then press Connect.
      The ID is checked with LiveKit (a token without an agent: no call, no
      cost). The page unlocks in place.

   - **No LiveKit URL is asked for.** The token server's address is the
     same for every project (`cloud-api.livekit.io`, with the ID sent as a
     header). Its answer carries the project's URL
     (`wss://<project>.livekit.cloud`), which is saved with the setup and
     shown: "Connected to <project>.livekit.cloud", and in Settings.
   - **A URL pasted** into the ID field (LiveKit shows the Token server URL
     right under the ID) gets an inline hint, and Connect stays off.
   - **The lock card** (680px wide):
     - "Watch the setup" opens the narrated video
       (`public/guides/livekit-setup.mp4`, 1:59, with a poster and WebVTT
       captions), which has a chapter button for each step;
     - below it, the three steps as a wizard: a progress bar (any step can
       be opened), one step at a time, Back and Next. Step 3 holds the
       fields and "Connect and unlock".

     Settings uses the same wizard, and opens on step 3 when a setup already
     exists. See "The setup video" below.
2. **Fills in** the role, the company and the job description.
3. **Starts the interview.** The call opens in a modal (`CallModal`; full
   screen on phones), so nothing needs scrolling:
   - the browser asks for the microphone;
   - a status line follows the interviewer: joining, speaking, listening,
     thinking;
   - there's a timer, Mute, "End without feedback" and "Finish and get
     feedback";
   - the live transcript of both sides fills the rest;
   - closing the modal during a call asks first, since it hangs up.
4. **Finishes and gets feedback.** The interviewer wraps up and sends its
   evaluation. After the call the modal shows it:
   - the score out of 10, a summary, and what went well;
   - each mistake: what was said, why it hurts, and a better answer;
   - "Download PDF", which saves the evaluation with the transcript;
   - the transcript, with Copy and Download (`.txt`).

   Once the modal is closed, a "Last interview" row on the page reopens it.

## How it works

- **The interviewer is a LiveKit agent** the user deploys with Agent Builder.
  Its voice and AI use LiveKit Inference, billed to the user's LiveKit
  project. Jobak needs no AI key for this tool, so the page doesn't use
  `AiToolGate`.
- **Per-call details** go as the agent's dispatch metadata:
  - JSON `{ role, company, job_description, candidate_name }` (built by
    `lib/interview-metadata.ts`, capped at 120, 120, 4,000 and 80
    characters);
  - Agent Builder reads it as `{{metadata.key}}` in the instructions and the
    greeting (`lib/interviewer-instructions.ts`);
  - one agent serves every interview. A test checks that the instructions
    use exactly the keys the page sends.
- **Tokens:** `TokenSource.developmentTokenServer(id).fetch({ roomName, participantIdentity, participantName, agentName, agentMetadata })`,
  then `room.connect(serverUrl, participantToken)`. `livekit-client` 2.23.0,
  pinned. Our code calls no `fetch` for LiveKit (the data-fetching rule's
  exception, AGENTS.md).
- **Transcript:** the agent's `lk.transcription` text streams.
  - The text arrives in pieces, so it's added up and shown as it comes.
  - One line per `lk.segment_id`. A line is final when
    `lk.transcription_final` is true, and a late interim never overwrites a
    final (`lib/transcript.ts`).
  - The user's own lines are recognised by `lk.transcribed_track_id`, one of
    our tracks.
- **Status:** the agent's `lk.agent.state` attribute, through a pure reducer
  (`lib/call-state.ts`).
- **The call itself** is `lib/interview-session.ts`. It takes the browser and
  LiveKit as parameters, so it's unit-tested with a fake room. The hook
  `useInterviewCall` passes the real ones.
  - **Every Start is an "attempt".** End, leaving the page, or a new Start
    makes the running attempt stale. Whatever it was still waiting on
    (mic, token, connect) is dropped, a room it created is disconnected, and
    its events no longer reach the page.
  - **The interviewer's voice** is played through a hidden `<audio>` element
    per subscribed audio track; `livekit-client` doesn't play remote audio
    by itself. If the browser blocks playback, the call shows "Turn on the
    interviewer's voice", which calls `room.startAudio()`.
  - **The interviewer leaving**, or the room closing after the interview,
    reads "The interviewer ended the interview." and hangs up. A lost
    connection reads "The call dropped."
  - **Transcript finals** are read from the stream's trailer, after the text
    has arrived.
- **Safety:**
  - The mic is asked for first: no permission means no call, so no agent is
    started on the user's account.
  - If no agent joins within 30 s, the page explains (a wrong agent name, or
    the agent isn't deployed) and hangs up.
  - End, leaving the page and `pagehide` all disconnect, which turns the mic
    off.

## The evaluation

The interviewer writes it, on the user's LiveKit, and sends it to the page
with a **client tool**: no AI key and no Jobak server involved.

- **The tool:** `submit_evaluation` (`lib/evaluation.ts`, `EVALUATION_TOOL`),
  added by the user in Agent Builder › Actions, with Silent on so it isn't
  spoken. Builder's parameter types are only string, number, integer and
  boolean, so `mistakes` is a JSON array in a string:
  `[{ said, why, better }]`.
- **Receiving it:** the call reaches the browser as an RPC call.
  `interview-session.ts` registers `room.registerRpcMethod("submit_evaluation")`,
  and `parseEvaluation` reads the payload leniently:
  - arguments at the top or under `arguments`;
  - mistakes as a string or an array, with or without code fences;
  - unreadable mistakes are kept as text;
  - the score is clamped to 1–10.

  An unreadable payload gets an error reply, so the agent can call the tool
  again.
- **"Finish and get feedback":**
  - turns the mic off and types `WRAP_UP_MESSAGE` to the agent on the
    `lk.chat` topic (Builder agents accept typed input by default);
  - when the evaluation arrives, it replies "received" and hangs up 1.2 s
    later ("evaluated");
  - with nothing after 45 s (a real evaluation took about 20 s), or if the message can't be sent, it hangs up as
    "no-evaluation".
- **The interviewer ending on its own:** the instructions tell it to call
  the tool whenever the interview ends, so an evaluation sent mid-call is
  kept, and the call goes on until it leaves.
- **The PDF** (`lib/evaluation-pdf.ts`) is made in the browser:
  - jsPDF, A4, with the role, company, date, score, summary, strengths,
    each mistake and the full transcript;
  - text jsPDF's fonts can't draw goes through the browser's "Save as PDF",
    like the other AI tools' documents.

## Where things live, and why

| What | Where | Why |
|---|---|---|
| Token server ID + agent name, and the project URL LiveKit returned | `localStorage` key `jobak.livekit.<accountId>` | Browser-only, as the user wanted. Per account. No LiveKit API key or secret anywhere. |
| Transcript and evaluation | page memory only | Not saved; Copy, Download and Download PDF exist for keeping them. |

The only Jobak data used: the account id and name (`requireDashboardUser`),
in `api/interview-prep.loader.ts`.

**The token server caveat (accepted, option 1):** LiveKit labels it "for
development and testing only", because anyone with the ID can open calls on
that project. The setup copy says so, and Settings shows only the ID's last
4 characters.

## Errors

| Problem | What the user reads |
|---|---|
| Token server ID rejected | "LiveKit didn't accept this token server ID…" (setup adds where to find it, and that it isn't the agent's ID) |
| Network | "LiveKit couldn't be reached. Check your connection." |
| Mic denied | "Allow the microphone to practise. Your browser asks once." |
| No interviewer in 30 s | "The interviewer didn't join. Check the agent name in Settings matches the one in LiveKit, and that the agent is deployed." |
| The call drops | "The call dropped." The transcript stays. |
| The interviewer finishes and leaves | "The interviewer ended the interview." |
| The browser blocks the voice | A "Turn on the interviewer's voice" button |
| No evaluation 45 s after Finish | "The interviewer didn't send feedback. Check that the agent has the submit_evaluation tool (Agent Builder › Actions) and is deployed." The transcript stays. |

## Testing

```bash
pnpm test             # settings store, metadata, instructions keys, transcript, call state, copy
pnpm check:livekit    # checks LIVEKIT_TOKEN_SERVER_ID (+ agent dispatch token) from .env; no call, no cost
```

On 2026-11-24:
- **The test browser, with a fake `livekit-client`:**
  - setup in the card, then unlock in place;
  - Start disabled until all three fields have text;
  - the status sequence, and interim-then-final transcript lines, the user's
    lines included;
  - the metadata sent;
  - End, a denied mic (no token requested), the 30 s join timeout, and
    375 px width.
- **Live, against a real LiveKit project** (token server on, the interviewer
  deployed as above): `pnpm check:livekit` accepted the token server ID,
  returned a dispatch token, and rejected a made-up ID. A real call in Chrome
  (a silent tone standing in for the mic):
  - the interviewer joined and greeted with the role and company filled in;
  - the final transcript line arrived from the stream's trailer;
  - its audio element was attached, and "Turn on the interviewer's voice"
    appeared because Chrome blocked autoplay;
  - End hung up.

  Speaking to it needs a real microphone.
- **The evaluation, live** (the agent with `submit_evaluation` deployed):
  - the candidate's answers were typed on `lk.chat`, and the interviewer
    answered them, which confirms Builder agents take typed input;
  - after Finish, it said goodbye and called the tool about 19 s later;
  - the RPC arrived as `submit_evaluation`, with the arguments as top-level
    JSON and `mistakes` as a JSON string;
  - it was parsed and shown with a score, a summary, 3 strengths and 4
    quoted mistakes, then the call hung up.

  A first try with no answers at all got a goodbye but no evaluation within
  the old 25 s limit, so the limit is now 45 s, and the wrap-up message
  insists on the tool even for a short interview.
- **Builder's generated code** for a client tool:
  `perform_rpc(method=<tool name>, payload=json.dumps(args), response_timeout=10)`.
  With Silent on, the agent ignores the reply but sees an error, so an
  unreadable evaluation is thrown back as an error, not returned.

## The setup video

Files: `public/guides/livekit-setup.{mp4,jpg,vtt}`, shown by `GuideVideo`
in `LiveKitGate`.

- **Built from:**
  - 13 frames: 12 LiveKit Cloud screenshots, one per step (the Actions step has two), and the feedback screen from a real call;
  - one narration line each, voiced locally with VoiceBox (Kokoro,
    `am_michael`);
  - ffmpeg: each frame held for its line plus a short pause, H.264 + AAC,
    `+faststart`;
  - captions timed from each segment's real length.
- **Before publishing a new cut,** blur the token server ID and URL, the
  project ID and URL, and the SIP URI: anyone with the token server ID can
  start calls on that LiveKit account.
- **If LiveKit's dashboard changes,** re-shoot the affected frames and update
  the matching steps in `livekit-setup-form.tsx`, so the video and the written
  steps agree.
