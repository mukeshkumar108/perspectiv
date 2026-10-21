// Half-duplex turn taking: the microphone feed is only sent to the server while the assistant is
// neither generating nor playing audio. Playback state comes from the phone, not the server, and a
// short cooldown after playback ends covers room echo of the last syllables.

export const DEFAULT_COOLDOWN_MS = 800;
export const DEFAULT_WATCHDOG_MS = 25_000;

export type SuppressionReason = 'assistant_turn' | 'assistant_playback' | 'cooldown' | null;

export class TurnGate {
  private assistantActive = false;
  private playbackActive = false;
  private suppressedUntil = 0;
  private lastActivityAt = 0;

  constructor(
    private readonly cooldownMs: number = DEFAULT_COOLDOWN_MS,
    private readonly watchdogMs: number = DEFAULT_WATCHDOG_MS,
  ) {}

  private touch(now: number) {
    this.lastActivityAt = now;
    this.suppressedUntil = Math.max(this.suppressedUntil, now + this.cooldownMs);
  }

  /** User finished a turn (server VAD stop or final transcript): the assistant owns the floor now. */
  userTurnEnded(now: number) {
    this.assistantActive = true;
    this.touch(now);
  }

  responseStarted(now: number) {
    this.assistantActive = true;
    this.touch(now);
  }

  audioDelta(now: number) {
    this.assistantActive = true;
    this.touch(now);
  }

  responseDone(now: number) {
    this.assistantActive = false;
    this.touch(now);
  }

  playback(state: 'playing' | 'idle', now: number) {
    this.playbackActive = state === 'playing';
    this.touch(now);
  }

  /** Local stop (user tapped, or flush): hand the floor back after the cooldown. */
  interrupted(now: number) {
    this.assistantActive = false;
    this.playbackActive = false;
    this.touch(now);
  }

  reset() {
    this.assistantActive = false;
    this.playbackActive = false;
    this.suppressedUntil = 0;
    this.lastActivityAt = 0;
  }

  reason(now: number): SuppressionReason {
    if (this.playbackActive) return 'assistant_playback';
    if (this.assistantActive) {
      // Server never answered (error, dropped event): do not stay muted forever.
      if (now - this.lastActivityAt > this.watchdogMs) {
        this.assistantActive = false;
      } else {
        return 'assistant_turn';
      }
    }
    if (now < this.suppressedUntil) return 'cooldown';
    return null;
  }

  canSendMic(now: number): boolean {
    return this.reason(now) === null;
  }
}
