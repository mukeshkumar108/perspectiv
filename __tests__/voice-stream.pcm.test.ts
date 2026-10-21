import {
  int16ToBase64,
  LinearResampler,
  PcmChunker,
  rms,
} from '../src/voice/stream/pcm';

describe('voice stream pcm helpers', () => {
  it('encodes int16 little-endian samples to base64', () => {
    const samples = Int16Array.from([0, 1, -1, 32767, -32768]);
    const expected = Buffer.from(new Uint8Array(samples.buffer)).toString('base64');
    expect(int16ToBase64(samples)).toBe(expected);
  });

  it('encodes lengths that need padding', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const samples = Int16Array.from(Array.from({ length: n }, (_, i) => i * 1000 - 2000));
      expect(int16ToBase64(samples)).toBe(
        Buffer.from(new Uint8Array(samples.buffer)).toString('base64'),
      );
    }
  });

  it('computes rms', () => {
    expect(rms(new Int16Array(0))).toBe(0);
    expect(rms(Int16Array.from([16384, -16384, 16384, -16384]))).toBeCloseTo(0.5, 5);
  });

  it('passes samples through when rates match', () => {
    const input = Int16Array.from([1, 2, 3]);
    expect(new LinearResampler(16000, 16000).process(input)).toBe(input);
  });

  it('resamples 48k to 16k keeping a continuous ramp across buffers', () => {
    const r = new LinearResampler(48000, 16000);
    const ramp = Int16Array.from(Array.from({ length: 4800 }, (_, i) => i));
    const a = r.process(ramp.slice(0, 1000));
    const b = r.process(ramp.slice(1000, 3000));
    const c = r.process(ramp.slice(3000));
    const all = Int16Array.from([...a, ...b, ...c]);
    // 4800 samples at 3:1 -> about 1600 samples, each 3 apart
    expect(Math.abs(all.length - 1600)).toBeLessThanOrEqual(2);
    for (let i = 1; i < all.length; i += 1) {
      expect(all[i] - all[i - 1]).toBe(3);
    }
  });

  it('upsamples 8k to 16k with interpolation', () => {
    const r = new LinearResampler(8000, 16000);
    const out = r.process(Int16Array.from([0, 100, 200, 300]));
    expect(Array.from(out)).toEqual([0, 50, 100, 150, 200, 250]);
  });

  it('re-slices a stream into fixed chunks and keeps the remainder', () => {
    const c = new PcmChunker(4);
    expect(c.push(Int16Array.from([1, 2, 3])).length).toBe(0);
    const out = c.push(Int16Array.from([4, 5, 6, 7, 8, 9]));
    expect(out.map((x) => Array.from(x))).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
    ]);
    const next = c.push(Int16Array.from([10, 11, 12]));
    expect(next.map((x) => Array.from(x))).toEqual([[9, 10, 11, 12]]);
  });
});
