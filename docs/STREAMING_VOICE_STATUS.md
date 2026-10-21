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

## Server side (built and tested locally; not deployed)

Decision taken (option A): the flow prompt reaches the Runtime through its existing
`TurnInput.application_context.character_constitution` (`product-context-v1`). Verified in the Runtime code:
the constitution is **prepended** to the registered Bloom base instruction (`subtractive_prompt.py`
`compile_foreground_prompt`), so Bloom's base, tools and the other prompt blocks are kept, not replaced.
`bloom` is already a registered profile and an isolated product; no Runtime code change is needed.
The Runtime's own `TurnInput` schema accepts the payload shape voice now builds **[ran]**.

- `b_attic`, branch `voice-streaming-connect`: `POST /api/bluum/voice/connect` (Clerk user + flow ->
  signed 5 min token) and `POST /api/bluum/voice/session-config` (service key + token -> unchanged flow
  prompt, user, timezone). 9 new tests pass; 2 pre-existing failures in `promptPolicy.test.ts` are unrelated.
  Env: `VOICE_SESSION_SECRET`, `VOICE_SERVICE_KEY`, `VOICE_PUBLIC_URL` (the `wss://.../v1/realtime` URL).
- `sophie-voice`, branch `bloom-session-context` in the separate worktree `~/play/sophie-voice-bloom`
  (your uncommitted work in `~/play/sophie-voice` is untouched, but it overlaps `websocket_router.py`, so
  merging will need a manual reconcile): `?token=` on `/v1/realtime` is exchanged server to server, and
  `companion_id`, `trusted_user_context` and `application_context` are copied into each TurnInput. Invalid
  token is rejected before a slot is claimed. 665 tests pass (9 new).
  Env: `VOICE_SESSION_CONFIG_URL` (b_attic `.../api/bluum/voice/session-config`), `VOICE_SESSION_CONFIG_KEY`
  (same value as b_attic `VOICE_SERVICE_KEY`), optional `VOICE_REQUIRE_SESSION_TOKEN=1`.
- Not done: Cortex memory for Bloom (stays off, needs your sign-off); the deploy; any run against live
  services.

### Why it stopped: deploy needs access I was denied

The permission system blocked a read-only `ssh deploy@161.97.150.246`, so I did not touch the VPS. To finish:

1. Merge `bloom-session-context` into `sophie-voice` main (reconcile with your uncommitted router edits) and
   `voice-streaming-connect` into `b_attic` main; push both.
2. Set the env vars above on Vercel (b_attic) and in the `voice-runtime` container; use one shared secret
   value for `VOICE_SERVICE_KEY` / `VOICE_SESSION_CONFIG_KEY`.
3. Make the voice server reachable over TLS (`wss://`); Expo Go on a phone will not connect to plain `ws://`
   on a public host reliably. Whether `voice-runtime` is publicly reachable today is still unknown.
4. Rebuild and restart `voice-runtime` on the VPS using the recipe in the handover.
5. In Expo Go, open the Voice screen, tap a flow, and talk. First thing to check in the logs: the connect
   call returns a token, voice logs the token exchange, and the first TurnInput carries `companion_id=bloom`.

The two-sentence honest status: transport pieces are unit-tested and the Runtime contract is verified, but no
audio has flowed phone -> sophie-voice -> Runtime -> phone yet.
