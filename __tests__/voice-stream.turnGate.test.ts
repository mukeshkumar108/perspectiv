import { TurnGate } from '../src/voice/stream/turnGate';

describe('TurnGate', () => {
  it('sends mic when idle', () => {
    expect(new TurnGate(800).canSendMic(1000)).toBe(true);
  });

  it('mutes from end of user turn until playback finished plus cooldown', () => {
    const g = new TurnGate(800);
    g.userTurnEnded(1000);
    expect(g.reason(1100)).toBe('assistant_turn');
    g.responseStarted(1500);
    g.audioDelta(1600);
    g.playback('playing', 1600);
    // server finished generating long before the phone finished playing
    g.responseDone(2000);
    expect(g.reason(5000)).toBe('assistant_playback');
    g.playback('idle', 6000);
    expect(g.reason(6500)).toBe('cooldown');
    expect(g.canSendMic(6801)).toBe(true);
  });

  it('does not resume on responseDone alone while audio is still playing', () => {
    const g = new TurnGate(100);
    g.audioDelta(0);
    g.playback('playing', 0);
    g.responseDone(10);
    expect(g.canSendMic(10_000)).toBe(false);
  });

  it('releases itself if the server never answers', () => {
    const g = new TurnGate(100, 5000);
    g.userTurnEnded(0);
    expect(g.canSendMic(4000)).toBe(false);
    expect(g.canSendMic(6000)).toBe(true);
  });

  it('interrupt hands back the floor after the cooldown', () => {
    const g = new TurnGate(300);
    g.audioDelta(0);
    g.playback('playing', 0);
    g.interrupted(1000);
    expect(g.reason(1100)).toBe('cooldown');
    expect(g.canSendMic(1301)).toBe(true);
  });
});
