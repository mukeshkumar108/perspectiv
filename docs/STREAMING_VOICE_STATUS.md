# Streaming voice migration: status (2026-10-21)

Branch `voice-streaming-sdk57` in `perspectiv` (two local commits, not pushed). Companion to
`HANDOVER_STREAMING_VOICE.md`. Marked **[ran]** = executed here, **[phone]** = ran on the founder's
iPhone in Expo Go 57.0.9, **[unproven]** = not run.

## Section 5 spike result

- Store Expo Go opens SDK 57 only (Settings screen: Client 57.0.9, Supported SDK 57.0.0) **[phone]**.
  SDK 58 Expo Go is announced for "within a few weeks"; SDK 57 is the target.
- `expo-audio` `useAudioStream` (new in SDK 56) delivers int16 PCM in Expo Go **[phone]**: 24 kHz mono,
  2040-sample buffers every ~100 ms; a 250 ms click train arrived with exact spacing (no dropped audio).
  The buffer `timestamp` field is not usable (advanced 0.12 s over 5 s).
- Playback of queued chunks works in Expo Go two ways **[phone]**, both with no gaps >= 20 ms and
  barge-in cut-off of about 150 ms or less (mic-measured, resolution ~100 ms):
  - `expo-audio` `AudioPlaylist` (one WAV file per chunk): first audio ~180-200 ms.
  - hidden WebView with Web Audio scheduling: first audio ~165 ms; RN <-> WebView round trip 1.3 ms mean.
- Critical: starting the mic stream resets the iOS audio session and silences playback unless
  `setAudioModeAsync({allowsRecording:true, shouldRouteThroughEarpiece:false, ...})` is applied again
  after `stream.start()` **[phone]**.
- Loudspeaker audio leaks into the mic (level ~0.0055 vs 0.0003 noise). Hence half-duplex turn taking.

## Built in perspectiv

- SDK 54 -> 57 upgrade **[ran]**: typecheck clean except the pre-existing untracked `useLogActivity.ts`,
  43 jest tests pass, `expo export --platform ios` bundles. Required: `@react-navigation/*` imports repointed
  to `expo-router/*` (SDK 56+), `expo-av` replaced by an `expo-audio` backed adapter (`src/audio/sound.ts`),
  `expo-asset` added, `android.edgeToEdgeEnabled` removed, TypeScript 6 `types` added.
  `expo-doctor` still warns about Xcode < 26.4 (irrelevant to Expo Go).
- Streaming client **[ran: unit tests only]** in `src/voice/stream/`: `pcm.ts` (base64, resampler, chunker),
  `turnGate.ts` (mic is only sent when the phone has finished playing + 800 ms cooldown; the 800 ms is a
  guess), `PlaybackHost.tsx` (hidden WebView Web Audio), `useStreamingVoice.ts` (WebSocket + mic + gate),
  screen `app/(main)/voice-session.tsx` with the four flow buttons, tap-the-orb to interrupt.
- `api.connectVoice` + schemas added (additive). The old push-to-talk client methods and schemas remain in
  `src/api/*` untouched (protected files); only the hooks and screen usage were removed.
- **[unproven]**: any run of this screen on a phone, any connection to `sophie-voice`, and the whole
  end-to-end flow. The web audio first-chunk lead (60 ms) and 16 kHz output rate are taken from `sophie-mob`.

## Server side: deployed and verified (2026-10-21)

Decision taken (option A): the flow prompt reaches the Runtime through its existing
`TurnInput.application_context.character_constitution` (`product-context-v1`). Verified in Runtime code:
the constitution is **prepended** to Bloom's registered base instruction (`compile_foreground_prompt`), so
Bloom's base, tools and other prompt blocks are kept. `bloom` was already a registered, isolated product.

Correction found at deploy time: the VPS does not run `sophie-voice`. It runs `voice-runtime`
(`github.com/mukeshkumar108/voice-runtime`, branch `consumer-cutover`), which already had a product-issued
call-token design (HMAC token, `GET {host}/api/voice/context`, `POST {host}/api/voice/turn`) built for the
Sophie web host. My first `sophie-voice` branch (`bloom-session-context`) was built on the wrong base and was
not deployed. The change was redone on `consumer-cutover` (commit `55ff5ae`, pushed, 669 tests pass).

- `voice-runtime` (VPS): token may carry a `host` claim, honoured only if listed in `VOICE_ALLOWED_HOSTS`
  (set to `https://b-attic.vercel.app`; the env file was backed up first); the host's context response may
  carry `application_context`, forwarded verbatim into each TurnInput. Sophie's behaviour is unchanged
  (tests cover it). Redeployed; container healthy.
- `b_attic` (Vercel production, `main` @ `9543148`): `POST /api/bluum/voice/connect` (Clerk user + flow ->
  5 min token; returns `wss://api.unknwnfreq.xyz/voice/v1/realtime`), `GET /api/voice/context` and
  `POST /api/voice/turn` (bearer = the token; made public in `src/proxy.ts` because they verify it
  themselves). New Vercel production env: `VOICE_SESSION_SECRET` (the same value the voice server uses),
  `VOICE_PUBLIC_URL`, `VOICE_HOST_PUBLIC_URL`. Production was identical to `main` before the deploy.
- Cross-language check: a token minted by the `b_attic` code verifies in the voice server's Python verifier.

### End-to-end result (scripted client from a Mac, not the phone)

Over public `wss://` to the live server with a Bloom token (synthetic user, so the context fetch returned
404 and the call ran as plain Bloom): speech in, accurate transcript, Bloom reply as streamed audio
(8.2 s), no errors. Speech-end to first audio: 3.7 s; the brain's first token alone took 2.3 s.
`GET /api/voice/context` for a real user id returned 200 with the 9,009 character Reflection Core prompt.
A bad token is refused with 403.

### Still unproven

- Anything on the phone: the Expo Go screen, mic capture into the live server, playback of the reply, the
  turn gate timing (800 ms cooldown is a guess), the 16 kHz output assumption in the client.
- The real flow prompt inside a live Runtime turn for a real user (the scripted run used a synthetic user so
  that no real person's record was written). Check the first phone session's Runtime logs for this.
- Voice Demo (its prompt is a per-turn template; turn slots are filled empty).
- The pool has one slot: one call at a time.
- Cortex memory for Bloom stays off (needs sign-off). Spoken turns are not saved anywhere yet.

## Audio reliability work (2026-10-21, evening)

- Lemonfox streams at about 1x real time with ~1 s start-up per sentence, and sometimes stalls or crawls (first
  byte 5.6 s, 0.19x seen live). Deployed in `voice-runtime` (`consumer-cutover`): bounded reads + cancel-on-interrupt
  (a stuck stream no longer blocks the single TTS thread), re-request of a slow first byte (4 s, twice), and a
  one-sentence look-ahead (next queued sentence is requested while the current one streams; local test: gap under
  0.3 s vs over 0.5 s without it; seen live as "prefetched").
- Second provider chosen by voice name: a session asking for `Noelle` is served by `heygen/heygen-voice-1-turbo`
  through OpenRouter (`/audio/speech`, raw PCM, `audio/pcm;rate=44100;channels=1`, about $4 per million characters,
  measured 2-5.5x real time live). Settings: `VOICE_ALT_TTS_*` in the VPS `deploy/.env`; key `voice-tts` on OpenRouter,
  capped at $2/day. Sessions that do not ask for that voice (Sophie web) stay on Lemonfox unchanged. 44.1 kHz goes
  through one stateful soxr stream. `b_attic` connect now returns `voice: "Noelle"` and the app sends it.
  Rollback: delete the `VOICE_ALT_TTS_*` lines from the VPS env and restart; Noelle then falls back to Lemonfox.
- Not understood yet: on the phone the voice was silent while the server's audio was verified non-silent (rms 0.10-0.15).
  The app now logs audio-engine state (`[voice] audio {...}`) and the voice screen has a "Test sound" button that plays
  a beep through the same path with no server involved.

## Durable memory for Bloom: off (2026-10-21)

- What was happening: each Bloom call end made the Runtime hand the call to Cortex's legacy world interpreter
  (28 turns vs 16 call ends vs 16 `[world-interpret]` runs in the last 4 h: once per session, never per message).
  `SOPHIE_LEGACY_INTERPRETER_ENABLED=false` only governs companions on the Cortex memory pipeline (`MEMORY_PIPELINE_COMPANIONS`,
  default `sophie`), so it never covered Bloom. In-turn, the same interpreter can also be triggered at a sitting/episode
  boundary, plus a per-turn raw evidence write (no model call).
- Fix (companion-runtime `main` @ `9239eac`, deployed): `DURABLE_MEMORY_DISABLED_COMPANIONS=bloom` in the VPS `deploy/.env`.
  A listed companion keeps only its own conversation (tail + rolling summary): no Cortex interpretation or consolidation
  at any boundary or call end, no evidence-store or Honcho mirror writes, no world read into the prompt. Verified live: a Bloom
  call end no longer produces a `[world-interpret]` line. Default (unset) behaviour is unchanged. To turn it back on, remove
  the `bloom` entry and restart the Runtime.
- Already written before the switch: Bloom calls from earlier today (including synthetic `e2e-*` users from my tests) are in
  Cortex. Erase tooling exists (`synapse-cortex/docs/DATA_LIFECYCLE.md`); not run.
- Note: `tests/test_preparation.py::test_trajectory_restores...` fails on a clean checkout because
  `evals/behaviour/datasets/__init__.py` imports `cambridge.py`, which is untracked in the working tree.

## Cortex model spend: NanoGPT-only mode (2026-10-21)

- Why `gpt-5.6-luna` fired: `openai/gpt-5.6-luna` is not in the NanoGPT subscription (NanoGPT's own `/api/subscription/v1/models`
  lists GLM, Qwen 3.8, Kimi, DeepSeek, MiniMax; it does not list luna, `gpt-5.4-nano`, the Gemini flash-lites or `qwen3.7-flash`).
  Cortex's structured-call adapter sent any model outside a hard-coded list to OpenRouter and had no retry or fallback at all.
  `SCENE_NARRATIVE_MODEL` defaulted to luna and was not overridden on the VPS; the agents' `openrouter:qwen/qwen3.7-flash`
  fallbacks and the Gemini defaults for meaning/judge were the same kind of spend. The big luna weeks were Oct 8-14 (eval/dev); recent
  use was a trickle (22-36 requests/day).
- Fix (synapse-cortex `main` @ `3d4b5eb`, deployed): `LLM_NANO_ONLY=true`. The requested model gets 3 attempts, then 3 other
  subscription models get 2 attempts each (qwen3.8-27b, kimi-k2.6, deepseek-v4-flash, glm-5.3-flash, in measured JSON order),
  inside a 120 s budget; a model outside the subscription is substituted; `openrouter:` chain entries are skipped; the turn
  extractor routes to NanoGPT. Explicit VPS settings: scene narrative `qwen3.8-27b`, meaning and judge `glm-5.3-flash`, agent
  fallbacks `qwen3.8-flash`. Verified in the production container: a luna request ran on qwen3.8-27b via NanoGPT at $0.
  Unset the flag to return to the old behaviour. Full Cortex suite: 884 passed.
- The same chain idea for speech recognition (Parakeet, then Lemonfox) is not built yet.

## Bloom model fix and voice features (2026-10-22)

- MiniMax-m3 was never actually used: it was missing from the Runtime's NanoGPT model ids (`NANOGPT_MODEL_IDS`), so the pinned-provider
  check rejected it every turn and Bloom fell through to DeepSeek. Fixed (companion-runtime `main` @ `0d0f148`); live turns now run
  `minimax/minimax-m3` on NanoGPT at 1.2-2.1 s. A test now fails if any model in Bloom's chain cannot route to NanoGPT.
- Voice features (voice-runtime `consumer-cutover` @ `d38cc6d`, `VOICE_FEATURES_ENABLED=true` on the VPS): each user utterance is measured
  (pitch, loudness, pauses, speaking rate, jitter, shimmer, HNR; Praat via `parselmouth`) in a separate low-priority subprocess; at most 4
  queued, extras are skipped; no audio is stored; any failure drops the measurement silently. Bloom calls log one `voice-features {...}` JSON
  line at session end. Same scripted calls with the worker on and off showed the same latency spread (brain 1.2-2.1 s; the spread is the Lemonfox
  default voice in the test script). Not yet stored anywhere but the server log; no per-person baseline yet.

## End-of-session report and per-person memory (2026-10-22)

- b_attic (`main` @ `33bbf53`, additive migration `20261022120000_voice_session_reports` applied to the production Neon DB): tables `VoiceSessionReport`
  and `UserMemory`; `POST /api/voice/session-report` and `GET /api/voice/memory` (bearer = the call's token, honoured for 3 h after it expires so
  long calls can still report). Memory merging (ids, counts, expiry, `notBefore`/`expiresAt`, `sensitivity`) is plain code in `src/lib/voice/memory.ts`;
  sensitive threads are never offered proactively. Items carry a paraphrased `basis` (no quotes) and a `correct` flag for reviewers.
- voice-runtime (`consumer-cutover` @ `b60f477`, `SESSION_REPORT_ENABLED=true`, `NANO_API_KEY` copied to its env on the VPS): when a Bloom call ends, a
  background thread makes two NanoGPT calls (card + descriptive profile; memory delta against what we know) and posts the result. The transcript is
  never sent to the host. Verified live with a throwaway user (since deleted): report + memory stored. Probe on a quiet "walk with Dad, we didn't say much"
  transcript gave `meaning_signal: high` with brief wording, the intended behaviour.
- Not built yet: the app's gratitude library and research ("last session") screens, adaptive v0 (injecting due threads and a style note into the next
  session's prompt), the accuracy-rating tap, baselines.

## Library, research view and adaptive v0 (2026-10-22)

- b_attic (`main` @ `1211b7a`): the voice context now appends a "what you know about them" block to Bloom's prompt (known nominal people, due
  non-sensitive threads, style notes, plus rules `relational_pivot`, `short_answers_ok`, `lighter_touch`; version `rules-v0`, in
  `src/lib/voice/directive.ts`). A thread surfaced at session start is marked `followed_up` so it is offered once. The report records the rule
  version and which rules applied. Clerk-authenticated: `GET /api/bluum/voice/library`, `GET /api/bluum/voice/research`, `POST /api/bluum/voice/rate`.
  Verified live with a throwaway user (deleted): block present, thread offered once, rule version stored.
- App: `app/(main)/library.tsx` (cards, newest first) and `app/(main)/research.tsx` (memory + per-session card, descriptive profile, raw voice numbers,
  memory updates with Right/Wrong taps, prompt and rule versions, cost; no transcripts). Linked from the voice session picker. Typecheck is clean apart
  from the untracked `useLogActivity.ts`; 47 jest tests pass; `expo export` bundles.
- `lighter_touch` compares the latest session with the person's own previous three (needs 4 reports) and is a first guess, not a validated signal.

## Fixes after the first real report (2026-10-22, afternoon)

- Prompt: every session prompt now ends with `SESSION_GUARDRAILS` (b_attic `src/lib/voice/directive.ts`): no invented body, weather or personal day; no
  steering toward a topic or category; short answers are fine. Triggered by Bloom saying "the sun's out here too" and asking "what animals have surprised
  you lately?" (the latter made the cow story partly prompted).
- Rules: `lighter_touch` (voice-based) is off by default (`VOICE_RULE_LIGHTER_TOUCH=1` turns it on); rule version `rules-v0.1`. The two transcript-profile rules stay on.
- Voice features (voice-runtime `efc1605`): clips under 1 s are skipped; each clip records a rough `snr_db`; jitter, shimmer and HNR are kept only from clips with
  SNR >= 15 dB (`clean_utterances` says how many). First real call read jitter 0.030, shimmer 0.13, HNR 9.4 dB, outside clean-lab ranges: phone mic, compression
  and outdoor noise. Absolute values are not interpretable; only change against the person's own history.
- Research screen: "Voice scores, latest session" table (latest, own average, % change, sigma once 3 earlier sessions exist; calibrating until 5), labelled as a raw
  phone signal; the query auto-refetches if it sits idle; the empty state says why. Right/Wrong persistence covered by a route test. The cause of the first blank
  screen (no request was sent) is still not identified.
- Memory prompt v2: shorter theme labels. A real regression test caught that a rewrite had dropped the voice worker's entry point.

## Exit ramps, re-entry, habits, hedge (2026-10-22, late afternoon)

- Runtime (`main` @ `0b99c79`, `VOICE_HEDGE_S=2.5` on the VPS): a silent first model is joined (not replaced) by the next candidate after 2.5 s; the first to
  emit speaks, the rest are cancelled. Replaces stacked 4.5 s deadlines (13 s of silence seen live when MiniMax and DeepSeek both stalled). Existing deadline kept as the fallback when the hedge is off.
- b_attic (`main` @ `7c41894`): session prompt now appends OPENING and CLOSING rules plus a per-session context line (first session ever / first today and how long since / back again
  today, with the part of the day in the person's timezone). Facts merge by the model's `ref`, then by wording; said twice or "every day" makes a `habit` (count, never expires), shown to Bloom as "Known, not news".
- voice-runtime (`2923aca`, report prompt v3): card condensed, memory call is shown fact/theme ids and returns `ref`/`recurring`, style notes only about how they talk (one per session).
- Found, not yet changed: `voice_reflection_core_v1.md` (the core flow prompt) contradicts the new rules: "Mentioning a moment does not end the session", RELIVE "at least two to three turns, do not rush to land", "name a few ordinary things she might have done and let her react",
  "lead the conversation", LAND with six beats, and an evening-only framing. Cause of the never-ending sessions and the leading questions. Rewrite pending approval.

## Five modular sessions (2026-10-22, evening)

- b_attic (`main` @ `26f0ac2`): session prompts are composed from `src/lib/llm/prompts/modules/` (`kernel`, `product`, `rules` + one of `morning`, `daytime`, `evening`, `ten_things`,
  `onboarding`), replacing `voice_reflection_core_v1.md` and the welcome v5 prompt for those flows (the old day0/core/demo flows are still accepted). Each flow has its own opening and
  closing (no closing question). Onboarding no longer claims the practice "rewires the brain" or is "scientifically validated"; it says the research is encouraging and that we measure.
- Morning intention: the report turns what they are looking forward to into one thread held until 18:00 local (`notBeforeHour`, enforced in the voice server) that expires the next day;
  the evening session gets it as a due follow-up. Ten things: each named item is stored as a `self_regard` fact and offered back lightly later. Cards carry a `kind` (intention, self,
  moment); the app labels them in "My moments". Invented memory refs from the model are dropped.
- App: five buttons (Morning, Drop-in, Evening reflection, Ten things about you, Welcome). The buttons are the test override: pick any session at any time.
- voice-runtime `905bd91`; Runtime hedge `VOICE_HEDGE_S=2.5` live. Not yet checked in a real session: how well she follows the closing rules and the new flows.

## Orb, About you, profile (2026-10-22, night)

- `src/components/VoiceOrb.tsx` (new, used by the voice screen; the old `VoiceOrbVisualizer` is untouched): a small calm core with a faint ring at rest; a quiet orbit of three dots while she thinks;
  dots gather inward along a 12-spoke star while you speak; dots stream outward, shrinking and fading, while she speaks, reacting to level. Connecting now shows the small resting state.
- Voice screen: session picker is tappable cards; calmer status label; "End session" pill; first-run "What should we call you?" card when no name is set; "About you" link.
- `app/(main)/you.tsx`: name, pronouns, gender, birth year (a year, 13+), email read-only. Backend (b_attic `14982e0`): optional `pronouns`, `gender`, `birthYear` columns on `User` (additive migration applied to production),
  `GET/PUT /api/bluum/profile`. Bloom's prompt gets the person's name (and pronouns); age and gender are not put in the prompt.
- DNS: `api.unknwnfreq.xyz` failed on public resolvers while Spaceship's own servers answered: the registry has a DNSSEC DS record but no matching DNSKEY is served. Fix at Spaceship: turn DNSSEC off or re-enable it properly.
