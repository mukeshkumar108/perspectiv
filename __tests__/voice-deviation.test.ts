import { voiceDeviation } from '../src/voice/deviation';

const rep = (f0: number, pause = 0.2) => ({ voiceFeatures: { f0_mean_hz: f0, pause_ratio: pause } });

describe('voiceDeviation', () => {
  it('has no baseline from a single session and says it is calibrating', () => {
    const d = voiceDeviation([rep(120)]);
    expect(d.priorSessions).toBe(0);
    expect(d.calibrating).toBe(true);
    expect(d.rows.find((r) => r.key === 'f0_mean_hz')).toMatchObject({ latest: 120, baselineMean: null, pctChange: null, z: null });
  });

  it('reports percentage change against the person\'s own earlier sessions', () => {
    const d = voiceDeviation([rep(132), rep(120), rep(120)]);
    const pitch = d.rows.find((r) => r.key === 'f0_mean_hz')!;
    expect(pitch.baselineMean).toBe(120);
    expect(pitch.pctChange).toBeCloseTo(10);
    expect(pitch.z).toBeNull(); // too few earlier sessions for a spread
  });

  it('gives a z-score once three earlier sessions exist, and shows fractions as percentages', () => {
    const d = voiceDeviation([rep(130, 0.3), rep(120, 0.2), rep(110, 0.2), rep(130, 0.2)]);
    expect(d.rows.find((r) => r.key === 'f0_mean_hz')!.z).toBeCloseTo(1, 5);
    expect(d.rows.find((r) => r.key === 'pause_ratio')!.latest).toBeCloseTo(30);
  });

  it('ignores sessions with no voice numbers and leaves calibration after five earlier sessions', () => {
    const d = voiceDeviation([{ voiceFeatures: null }, rep(1), rep(1), rep(1), rep(1), rep(1), rep(1)]);
    expect(d.priorSessions).toBe(5);
    expect(d.calibrating).toBe(false);
  });
});
