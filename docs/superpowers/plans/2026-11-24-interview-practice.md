# Interview practice (LiveKit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/dashboard/interview-prep` becomes a live voice interview with an
AI HR interviewer, running on the user's own LiveKit account from the
browser.

**Architecture:** The `ai-tools/interview-prep` slice is rebuilt:
- a settings store keeps `{ tokenServerId, agentName }` in `localStorage`
  per account;
- pure libraries build the agent metadata, the Agent Builder instructions,
  the transcript and the call state;
- one hook wraps `livekit-client`'s `Room`.

The page swaps `AiToolGate` for a LiveKit gate whose card holds the setup
form. Nothing reaches Jobak's server except the existing account guard.

**Tech Stack:** Next.js 16, React 19, TanStack Query v5, `livekit-client`
2.23.0, Tailwind 4, `node --test` via tsx.

**Spec:** `docs/superpowers/specs/2026-11-24-interview-practice-livekit-design.md`

## Global Constraints

- `livekit-client@2.23.0`, pinned exactly. No `@livekit/components-react`.
- No LiveKit API key or secret anywhere. Credentials are only
  `{ tokenServerId, agentName }`, under `localStorage` key
  `jobak.livekit.<accountId>`, with guarded access (blocked storage reads
  as `blocked`).
- Tokens only through `TokenSource.developmentTokenServer(tokenServerId).fetch({ roomName, participantName, participantIdentity, agentName, agentMetadata })`,
  then `room.connect(serverUrl, participantToken)`. Our code never calls
  `fetch` for LiveKit.
- **Metadata JSON keys:** exactly `role`, `company`, `job_description` and
  `candidate_name`, each trimmed and capped (120, 120, 4000 and 80
  characters).
- **Room name:** `interview-<crypto.randomUUID()>`. **Identity:**
  `candidate-<crypto.randomUUID()>`.
- **Transcripts:** topic `lk.transcription`, keyed by `lk.segment_id`;
  final when `lk.transcription_final` is `"true"` or `true`.
- **Agent state:** participant attribute `lk.agent.state`, one of
  `initializing | listening | thinking | speaking | idle`.
- **Join timeout:** 30 s after connecting with no agent participant ends
  the call with `agent-missing`.
- **The mic always stops** on End, on unmount and on `pagehide`, via
  `room.disconnect()`.
- Copy is exactly as the spec gives it (errors table, setup steps,
  instructions, greeting).
- No commits unless the user asks. Each task ends at a checkpoint.
- Live checks read `LIVEKIT_TOKEN_SERVER_ID` and `LIVEKIT_AGENT_NAME` from
  `.env` and never print them.

## Review Focus

1. **Mic denied, or no mic at all.** The page says "Allow the microphone to
   practise. Your browser asks once." and starts no call (and so no
   agent). Test: Task 3 `call-state.test.ts` "mic denied ends before
   connecting", plus the harness in Task 5.
2. **Wrong agent name** (the token works, but the agent never joins). After
   30 s the page explains it and disconnects. Test: Task 3 "no agent in
   30 s is agent-missing".
3. **The call drops mid-interview.** The transcript stays and the status
   reads "The call dropped.". Test: Task 3 "disconnect during a call keeps
   it ended with dropped".
4. **Out-of-order transcript pieces** (a final arriving before its interim,
   or two speakers interleaving). There's one line per segment, in
   first-seen order, and a late interim never overwrites a final. Test:
   Task 2 `transcript.test.ts`.
5. **A huge pasted job description, or blank fields.** The metadata is
   capped and Start is disabled until all three fields have text. Test:
   Task 2 `interview-metadata.test.ts`.

---

### Task 1: The dependency, the settings store and its hook

**Files:**
- Modify: `package.json` (add `livekit-client` `2.23.0`, via `pnpm add -w livekit-client@2.23.0`)
- Create: `src/frontend/modules/ai-tools/interview-prep/lib/livekit-settings.ts` and `livekit-settings.test.ts`
- Create: `src/frontend/modules/ai-tools/interview-prep/hooks/use-livekit-settings.ts`

**Interfaces:**
- Produces:
  ```ts
  interface LiveKitSettings { tokenServerId: string; agentName: string }
  type SettingsRead = { state: "saved"; settings: LiveKitSettings } | { state: "none" } | { state: "blocked" }
  readLiveKitSettings(accountId: string, storage?: Storage): SettingsRead
  saveLiveKitSettings(accountId: string, settings: LiveKitSettings, storage?: Storage): boolean
  removeLiveKitSettings(accountId: string, storage?: Storage): void
  checkTokenServer(tokenServerId: string): Promise<void>   // fetch a token with no agent; throws LiveKitSetupError
  class LiveKitSetupError extends Error { kind: "rejected" | "network" }
  useLiveKitSettings(accountId): { status: "loading"|"saved"|"none"|"blocked"; settings: LiveKitSettings | null; save(s): Promise<void>; saving: boolean; saveError: unknown; remove(): void }
  ```

- [ ] **Step 1: Write the failing store tests**, with an in-memory Storage and a throwing one (copy the helpers from `job-collection/lib/test-storage.ts` into this slice's `lib/test-storage.ts`):
  - `"keys by account"`: the key is exactly `jobak.livekit.a`, and `b` sees `none`;
  - `"saves trimmed values and rejects blanks"`: `saveLiveKitSettings` with `"  x  "` stores `"x"`; a blank `agentName` returns `false` and stores nothing;
  - `"malformed JSON reads as none"`;
  - `"blocked storage reads as blocked"`.
- [ ] **Step 2:** Run `pnpm test`. Expected: FAIL (the module is missing).
- [ ] **Step 3:** Run `pnpm add -w livekit-client@2.23.0`, then implement the store.
  - `checkTokenServer` calls `TokenSource.developmentTokenServer(id).fetch({ roomName: "jobak-check-" + crypto.randomUUID(), participantName: "check" })`.
  - An error whose message contains a 4xx status maps to `rejected`; anything else maps to `network`.
  - Implement the hook on `useSyncExternalStore`, with a custom `jobak:livekit-settings` event plus `storage`, as `use-apify-token.ts` does.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5:** Live check of the token server, which starts no agent and costs nothing. Write `scripts/livekit-check.ts` (plus a `check:livekit` script, `tsx --env-file=.env`). It calls `checkTokenServer(LIVEKIT_TOKEN_SERVER_ID)`, then fetches once with `agentName` and prints only `serverUrl`'s host and the token's length.
  - Expected: a `*.livekit.cloud` host, and a token length above 100.
  - A bogus ID must throw `rejected`.
- [ ] **Step 6:** Checkpoint.

### Task 2: Metadata, instructions, transcript

**Files:**
- Create in `src/frontend/modules/ai-tools/interview-prep/lib/`:
  - `interview-metadata.ts` (+ test)
  - `interviewer-instructions.ts` (+ test)
  - `transcript.ts` (+ test)

**Interfaces:**
- Produces:
  ```ts
  interface InterviewDetails { role: string; company: string; jobDescription: string }
  INTERVIEW_LIMITS = { role: 120, company: 120, jobDescription: 4000, name: 80 }
  canStart(details: InterviewDetails): boolean            // all three trimmed non-empty
  buildAgentMetadata(details: InterviewDetails, candidateName: string | null): string   // JSON with role, company, job_description, candidate_name ("the candidate" when no name)
  INTERVIEWER_INSTRUCTIONS: string; INTERVIEWER_GREETING: string; METADATA_KEYS: readonly string[]
  type Speaker = "interviewer" | "you"
  interface TranscriptLine { id: string; speaker: Speaker; text: string; final: boolean }
  applyTranscriptPiece(lines: TranscriptLine[], piece: { segmentId: string; speaker: Speaker; text: string; final: boolean }): TranscriptLine[]
  transcriptText(lines: TranscriptLine[]): string          // "Interviewer: …\nYou: …"
  ```

- [ ] **Step 1: Write the failing tests:**
  - `"caps every field and trims"`: a 5,000-character description becomes 4,000; the keys are exactly the four.
  - `"no name falls back to the candidate"`.
  - `"canStart needs all three"`.
  - `"the instructions use exactly the metadata keys"`: every `{{metadata.x}}` in the instructions and greeting has `x` in `METADATA_KEYS`, and each key appears at least once in the instructions.
  - `"interim then final replaces the text"`.
  - `"a late interim never overwrites a final"`.
  - `"lines keep first-seen order across speakers"`.
  - `"transcriptText labels speakers"`.
- [ ] **Step 2:** Run `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. The instructions and greeting are the spec's copy, written out in full as the spec summarises it.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5:** Checkpoint. Show the user the instructions text, so they can paste it into Agent Builder for the live test.

### Task 3: Call state and the call hook

**Files:**
- Create: `src/frontend/modules/ai-tools/interview-prep/lib/call-state.ts` (+ test)
- Create: `src/frontend/modules/ai-tools/interview-prep/hooks/use-interview-call.ts`

**Interfaces:**
- Produces:
  ```ts
  type CallPhase = "idle" | "mic" | "connecting" | "waiting-agent" | "live" | "ended"
  type AgentState = "initializing" | "listening" | "thinking" | "speaking" | "idle"
  type CallEnd = "user" | "dropped" | "agent-missing" | "mic-denied" | "token-rejected" | "network"
  interface CallState { phase: CallPhase; agent: AgentState | null; end: CallEnd | null; startedAt: number | null; muted: boolean }
  callReducer(state, action): CallState
  // actions: start, mic-ok, mic-denied, connected(at), agent-joined, agent-state(s), timeout, mute(on), ended(reason)
  useInterviewCall(settings: LiveKitSettings): { state: CallState; lines: TranscriptLine[]; start(details, name): Promise<void>; end(): void; setMuted(on: boolean): void }
  ```

- [ ] **Step 1: Write the failing reducer tests:**
  - `"mic denied ends before connecting"`;
  - `"connected waits for the agent, agent-joined goes live"`;
  - `"no agent in 30 s is agent-missing"`, meaning a `timeout` while `waiting-agent` ends with `agent-missing`, and a `timeout` while `live` is ignored;
  - `"disconnect during a call keeps it ended with dropped"`;
  - `"user end wins over a later dropped"`;
  - `"agent-state only applies while live"`.
- [ ] **Step 2:** Run `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement the reducer, then the hook. The hook:
  1. calls `navigator.mediaDevices.getUserMedia({ audio: true })` and stops those tracks right away, only to ask permission;
  2. fetches the token with `TokenSource`;
  3. runs `room.connect`, then `room.localParticipant.setMicrophoneEnabled(true)`;
  4. watches agents through `ParticipantConnected` and `ParticipantAttributesChanged`: a participant with `lk.agent.state` or `participant.isAgent` is the agent;
  5. reads `registerTextStreamHandler("lk.transcription")`, where the speaker is "you" when `participantInfo.identity` is the local identity;
  6. sets a 30 s timer from `connected` that dispatches `timeout`;
  7. on `Disconnected`, dispatches `ended("dropped")` unless the user ended it;
  8. on cleanup and `pagehide`, calls `room.disconnect()`.

  Errors: a token `rejected` gives `token-rejected`, and a network failure gives `network`.
- [ ] **Step 4:** Run `pnpm test`, `npx tsc --noEmit -p tsconfig.json` and `npx eslint src/frontend/modules/ai-tools/interview-prep`. Expected: all pass.
- [ ] **Step 5:** Checkpoint.

### Task 4: Screens, page, Settings, rules

**Files:**
- Create in `src/frontend/modules/ai-tools/interview-prep/components/`:
  - `livekit-setup-form.tsx`, with the three numbered steps, Copy buttons for the instructions and greeting, the two inputs, and Connect;
  - `livekit-gate.tsx`, `LockedFeature` with `action={{ content: <LiveKitSetupForm variant="compact" /> }}`;
  - `interview-form.tsx`, `call-panel.tsx`, `transcript-view.tsx`.
- Replace: `views/interview-prep-view.tsx` (props `{ accountId, candidateName }`). Delete `components/interview-prep-tool.tsx`.
- Create: `api/interview-prep.loader.ts` with `loadInterviewPrepPage(): Promise<{ accountId: string; candidateName: string | null }>`, from `requireDashboardUser()`. Export it from `ai-tools/server.ts`.
- Modify: `src/app/(protected)/dashboard/interview-prep/page.tsx` (loader, then view, no `AiToolGate`).
- Modify: `ai-tools/index.ts`, also exporting `LiveKitSettingsPanel` (the Settings tab body: saved values, Remove, and the form).
- Modify: `settings/lib/tabs.ts` (add `"interview-practice"` after `"job-collection"`), and `settings-panels.tsx` (label "Interview practice", copy, summary "LiveKit · Connected" / "Optional", body `LiveKitSettingsPanel`).
- Modify: `dashboard/config/nav-items.ts` (label "Interview practice", drop `preview`), and `overview/ai-tools.tsx` (description "Practise out loud with an AI interviewer").
- Modify: `shared/mocks/dashboard.ts` (remove `SAMPLE_INTERVIEW_QUESTIONS`, which nothing else uses).
- Modify: `AGENTS.md` and `docs/frontend/DATA_FETCHING.md`. The exception now names "Apify, LiveKit"; for LiveKit, `livekit-client` makes the requests and our code calls no `fetch`.

- [ ] **Step 1:** Implement, with the copy from the spec.
- [ ] **Step 2:** Run `npx tsc --noEmit -p tsconfig.json`, `npx eslint src/frontend/modules/ai-tools src/frontend/modules/settings src/frontend/modules/dashboard "src/app/(protected)/dashboard"` and `pnpm test`. Expected: all pass.
- [ ] **Step 3:** Checkpoint.

### Task 5: In the browser

- [ ] **Step 1:** Run `rm -rf .next/dev/types && pnpm build`. Expected: success, and `/dashboard/interview-prep` listed.
- [ ] **Step 2:** Harness with a fake token source and fake Room events (esbuild, as before):
  - locked, then set up in the card, then unlocked in place;
  - Start disabled until all three fields have text;
  - mic denied shows the message and makes no token request;
  - statuses change, and a transcript with an interim replaced by its final;
  - End: the transcript stays, with Copy and Download;
  - the join timeout;
  - 375 px width.
- [ ] **Step 3: Live, with `.env` values in the harness.** The harness only, never product code. It replaces `getUserMedia` with a silent oscillator track, then starts an interview.
  - Expected: the agent joins, the status goes to Speaking, and the greeting's transcript names the role and company sent. End then disconnects.
  - Report the result. The user's own mic test is the final check.
- [ ] **Step 4:** Checkpoint.

### Task 6: Docs and wrap-up

- [ ] **Step 1:** Write `docs/ai-tools/INTERVIEW_PRACTICE.md`:
  - the user flow and the setup;
  - the instructions text, and where it lives;
  - what's in the browser and why;
  - the token server caveat;
  - errors, and the tests.
- [ ] **Step 2:** Run `pnpm build` and `pnpm test`. Expected: both pass.
- [ ] **Step 3:** The final whole-branch review, then fixes, then the report.
