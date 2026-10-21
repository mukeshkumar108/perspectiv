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
