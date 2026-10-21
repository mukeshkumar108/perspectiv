# Handover: move Bluum (Perspectiv) onto the companion substrate with streaming voice

Written 2026-10-21 by the lead engineer of the substrate (Claude Code), for a fresh session. Start in `play/perspectiv`. Read this whole file first; it replaces the context of the conversation it came from.
Facts below are marked **[verified]** (checked in code/ledger), **[claimed]** (from a third party, not checked) or **[open]** (unknown). Do not treat claimed items as facts.

## 1. What we are doing, in one paragraph

Bluum is a voice-first daily-reflection app. Today it is a React Native (Expo) app, `play/perspectiv`, backed by a Next.js backend, `play/b_attic`, using an old push-to-talk pipeline (record a clip, upload, STT, OpenRouter, TTS, play). That pipeline was built before the companion architecture and is **retired**: no compatibility needed (the founder is the only user). We replace it with **streaming voice through the companion substrate**, keeping the **existing session buttons and prompts** for now (the founder will restructure prompts later). Auth, users, lessons, streaks, mood, UI and visual design stay in the product; turn compilation, memory and continuity belong to the substrate.

## 2. The substrate (reusable; products stay thin)

| Repo | Role |
|---|---|
| `play/companion-runtime` | The brain. `POST /v1/turns[/stream]` takes a `TurnInput` and returns the reply. Owns turn compilation, model routing, tail + rolling summary, recovery. Has a **Bloom profile** (`companion_core/profiles/bloom.py`, application `bloom`), currently disabled; per its header it expects Bloom/BFF to supply `sessionMode` + `day_packet`. |
| `play/synapse-cortex` | Memory/understanding service the Runtime calls (ledger, notes, connected world). Product-isolated; Bloom enablement is gated on founder sign-off. |
| `play/honcho` | Evidence/session store used by the Runtime. |
| `play/sophie-voice` | **The voice server** (Python, fork of Hugging Face speech-to-speech): VAD, STT, TTS, barge-in. Exposes an OpenAI-Realtime-style WebSocket at `/v1/realtime` (also WebRTC). Sends each spoken turn to the Runtime as a `TurnInput` with `medium: voice`; contains no behaviour or prompts. Contract: `sophie-voice/docs/VOICE_RUNTIME_CONTRACT.md`. **[verified]** |
| `play/sophie-mob` (Ember) | A generic Expo starter app. Only `src/features/voice/` matters: a phone-side **client** for `sophie-voice`'s `/v1/realtime` (mic capture, base64 PCM streaming, queued PCM playback, barge-in, capture-health, tests). It uses `react-native-audio-api` (a native module, **not in Expo Go**). **[verified]** |

`sophie-voice` is the server and `sophie-mob/src/features/voice` is a client for it; they are two ends of one connection, not alternatives. **[verified: same `/v1/realtime` path]**. That the client works against today's server build is **[open]** (never run together in this session).

Production: VPS `deploy@161.97.150.246`; Runtime at `~/companion-runtime`, Cortex at `~/synapse-cortex`; containers `companion-runtime`, `voice-runtime` (running), compose file `deploy/docker-compose.vps.yml`. Deploy recipe: `cd ~/<repo> && git pull --ff-only && cd deploy && docker compose -f docker-compose.vps.yml --env-file .env build && ... up -d`. Whether `voice-runtime` is reachable from the public internet over TLS is **[open]**.

## 3. Current Bluum (all **[verified]**)

- `perspectiv`: Expo SDK `~54.0.33`, RN 0.81.5, expo-router, Clerk (`@clerk/clerk-expo`), `expo-av` for audio, react-query. Voice screen `app/(main)/voice-session.tsx` (1,439 lines) with four buttons: `onboarding`, `first_reflection_day0`, `first_reflection_core`, `voice_demo`; helpers in `src/voice/sessionLogic.ts`; API client `src/api/client.ts` (`startVoiceSession`, turn, end); hooks `src/hooks/useVoiceSession.ts`. Entry from `app/(main)/(tabs)/index.tsx`. Uncommitted local changes exist in the repo (14 files); do not discard them.
- `b_attic` (Next.js + Prisma/Neon + Clerk + Vercel Blob): `/api/bluum/voice/session/{start,turn,end}`, `src/lib/voice/service.ts` (1,955 lines: flow state machines, prompt building, calls `src/lib/llm/openrouter.ts` directly, ElevenLabs/Lemonfox providers), prompts in `src/lib/llm/prompts/*.md` (`voice_onboarding_welcome_v5`, `voice_first_reflection_day0_v1`, `voice_reflection_core_v1`, `voice_demo_main_v1`, identity/intervention kernels), memory in a Prisma `UserSummary` table. Contract docs in `b_attic/docs/`.

## 4. Hard constraints from the founder

1. **Testers use Expo Go.** Ashley (non-technical) and Vinesh must be able to install Expo Go and scan a QR code. **No builds, no Xcode, no TestFlight** for this testing phase. A path that needs a custom/EAS build is a fallback, not the default.
2. Streaming voice only; no push-to-talk. Hide or remove the old pages/routes; do not maintain them.
3. Keep the four existing session buttons and the existing prompts for the initial migration. Prompt restructuring comes later.
4. Cost discipline: solo founder, pay-per-call; keep tests small and targeted; ask before spending on broad evals; no destructive commands without asking. Offload research/mechanical work to cheaper models (Gemini/Spark) where the founder prefers; produce briefs they can paste.
5. Principle: code validates and renders; models decide meaning. Do not add scenario-specific rules to prompts or the summariser.

## 5. The open technical question (do this FIRST, it decides the client)

**Can streaming two-way voice work in Expo Go?**

- Microphone → server: ChatGPT **[claimed]** that Expo SDK 56+ added `useAudioStream` in `expo-audio` (raw PCM buffers via an `onBuffer` callback, selectable sample rate/encoding), and that `expo-audio` ships in Expo Go. Verify in the official docs for the target SDK.
- Server → speaker: **[open]**. `sophie-voice` sends audio chunks (PCM, via `response.output_audio.delta`-style events; confirm exact event names and format in `sophie-voice/src/speech_to_speech/api/openai_realtime/` and in `sophie-mob/src/features/voice/native-audio.ts`). We need to play chunks as they arrive and **discard queued audio instantly on barge-in**. Expo's documented playback is file/URL based; a gap-free PCM chunk queue may not be possible in Expo Go. Options to evaluate: (a) a rolling set of small WAV chunks via `expo-audio` players (latency/gaps?), (b) `react-native-audio-api` (check whether it works in Expo Go — it is a native module, so probably no), (c) WebView-based Web Audio playback inside Expo Go (a plain `AudioContext` in a hosted/inline page can queue and cancel PCM with sample accuracy — worth a short spike), (d) WebRTC path of `sophie-voice` with `react-native-webrtc` (native, probably not Expo Go), (e) fall back to an EAS development build.
- **Expo Go version constraint [claimed, important]:** the store version of Expo Go supports only the current SDK (and sometimes the previous one). Perspectiv is on SDK 54. ChatGPT **[claimed]** SDK 58 shipped 2026-10-15 but its store Expo Go is not yet available and SDK 57 is the practical target. Verify: which SDK does the Expo Go currently on the App Store / Play Store open? If Perspectiv's SDK 54 will not open in testers' Expo Go, an SDK upgrade is mandatory; pick the newest SDK that the store Expo Go supports, not the newest SDK.
- Deliverable of the spike: a one-page result (works / works with caveats / does not work) per option, with measured behaviour: first-audio latency, gaps, barge-in cutoff time, and whether it runs in Expo Go on a real iPhone. Prefer the simplest path that works in Expo Go.

## 6. Plan after the spike

1. **`sophie-voice` per-connection identity [verified gap].** Today the companion and user are process launch args (`companion_runtime_companion_id`, `user_id` in `src/speech_to_speech/LLM/companion_runtime_language_model.py`); the client cannot say who it is. Add: accept a short-lived signed token (HMAC, shared secret with the BFF) on connect carrying `user_id`, `companion_id=bloom`, `timezone`, `session_mode`, and the session instruction; copy these into each `TurnInput` (`trusted_user_context`, `session_routing`/`sessionMode`). `sophie-mob` already sends a client `session.update {instructions}`; decide whether to use that (simple, fine for one user) or the signed token (right for more users). Check what the Runtime's Bloom profile and `world_context`/session fields actually accept.
2. **`b_attic`.** One endpoint, e.g. `POST /api/bluum/voice/connect {flow}`: Clerk-authenticated; loads that flow's existing prompt `.md`; returns `{ voiceUrl, token }`. Put the push-to-talk routes behind a flag (off) and stop calling OpenRouter/ElevenLabs/Lemonfox from there. Keep auth, users, lessons, streaks, mood.
3. **Runtime.** Enable the `bloom` application for the founder only (it is disabled). Confirm its profile accepts a per-session instruction; do not enable Bloom memory in Cortex without founder sign-off (gating: erase/export tooling exists; see `synapse-cortex/docs/DATA_LIFECYCLE.md`).
4. **Perspectiv.** Port the client from `sophie-mob/src/features/voice` (protocol, capture-health, playback queue, barge-in) adapted to whichever audio option the spike chose; rework `voice-session.tsx` so the same four buttons open a stream; drive `VoiceOrbVisualizer` from live audio level/state; drop typed input, staged/finalize turns, scripted choice chips and demo overlays (flag them). Remove the old voice hooks/API calls.
5. **Deploy and test** with the founder first, then Ashley/Vinesh via Expo Go. Report honestly what ran vs. what is unproven.

Known losses accepted for now: scripted choices, "ready to end" cue, breathing-overlay interventions, and saving a `DailyReflection` at session end. They return later via Cortex and the prompt restructure.

## 7. Delegable to a cheaper model (Gemini / Spark), produce briefs and paste results back

- SDK research: which SDK the store Expo Go supports today; upgrade path 54 → target; list of Perspectiv dependencies that break (Clerk, skia, reanimated, gesture-handler, expo-av removal, expo-router); estimate effort.
- Read-only audit of `b_attic/src/lib/voice/service.ts` and prisma tables into keep / replace / delete.
- The audio spike measurements on a real phone (the founder's), with a script that logs latency and gaps.

## 8. Rules for the new session

- Work in `play/perspectiv` first; edit `b_attic`, `sophie-voice`, `companion-runtime` only as needed, each in its own repo with targeted `git add` commits. Do not touch Cortex prompts. Do not commit unrelated pre-existing changes.
- Report: what ran, what advanced, what remains unproven. Do not claim a phone test passed unless it was run on a phone.
