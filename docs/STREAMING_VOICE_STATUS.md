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

## Blocker found in the substrate (needs founder decision)

`sophie-voice` deliberately ignores client instructions: `CompanionRuntimeModelHandler._apply_config` is a
no-op ("the brain builds the system prompt server-side; voice must not inject its own instructions"). So the
handover's "client sends `session.update {instructions}`" path does not reach the Runtime. Also the Runtime's
Bloom profile expects `sessionMode` + `day_packet` from the BFF, and I found no such field in the TurnInput
schema. user_id / companion_id / timezone are process launch args today.

Therefore the per-session flow prompt needs a real contract, across three repos:

1. Runtime: a way to receive the Bloom session mode / instruction per conversation (new TurnInput field or a
   session-registration call), and enabling the `bloom` application (founder-only; Cortex memory stays gated).
2. `sophie-voice`: per-connection identity (signed token: user_id, companion_id=bloom, timezone, session mode)
   copied into each TurnInput.
3. `b_attic`: `POST /api/bluum/voice/connect` returning `{ voiceUrl, token }` (the client already expects
   this plus optional `instructions`/`voice`), loading the existing prompt `.md` for the flow.

Not started: all three, plus any deploy to the VPS. `sophie-voice` and `companion-runtime` both have
uncommitted work of the founder's in their trees.

Also noted: the screen had three flow buttons in the repo, not four; `voice_demo` was added to the new picker
and the connect schema, but `voice_demo_main_v1.md` contains `{{ }}` placeholders that need filling.
