// Pure PCM helpers for the streaming voice client (no native modules, unit-tested).

export const VOICE_INPUT_SAMPLE_RATE = 16_000;
export const VOICE_INPUT_CHUNK_SAMPLES = 640; // 40 ms at 16 kHz

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function int16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triplet = (a << 16) | (b << 8) | c;
    out += BASE64_ALPHABET[(triplet >> 18) & 0x3f];
    out += BASE64_ALPHABET[(triplet >> 12) & 0x3f];
    out += i + 1 < bytes.length ? BASE64_ALPHABET[(triplet >> 6) & 0x3f] : '=';
    out += i + 2 < bytes.length ? BASE64_ALPHABET[triplet & 0x3f] : '=';
  }
  return out;
}

export function rms(samples: Int16Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const v = samples[i] / 32768;
    sum += v * v;
  }
  return Math.sqrt(sum / samples.length);
}

/** Wraps mono 16-bit PCM in a WAV container (for players that only take files). */
export function pcm16ToWav(samples: Int16Array, sampleRate: number): Uint8Array {
  const dataBytes = samples.length * 2;
  const out = new Uint8Array(44 + dataBytes);
  const view = new DataView(out.buffer);
  const tag = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  tag(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let i = 0; i < samples.length; i += 1) view.setInt16(44 + i * 2, samples[i], true);
  return out;
}

/** Streaming linear resampler. Keeps its position across calls so buffer edges stay continuous. */
export class LinearResampler {
  private readonly step: number;
  private pos = 0;
  private prev = 0;

  constructor(
    readonly fromRate: number,
    readonly toRate: number,
  ) {
    this.step = fromRate / toRate;
  }

  process(input: Int16Array): Int16Array {
    if (this.fromRate === this.toRate) return input;
    const out: number[] = [];
    while (Math.floor(this.pos) + 1 < input.length) {
      const i0 = Math.floor(this.pos);
      const frac = this.pos - i0;
      const s0 = i0 < 0 ? this.prev : input[i0];
      const s1 = input[i0 + 1];
      out.push(Math.round(s0 + (s1 - s0) * frac));
      this.pos += this.step;
    }
    if (input.length > 0) {
      this.pos -= input.length;
      this.prev = input[input.length - 1];
    }
    return Int16Array.from(out);
  }

  reset() {
    this.pos = 0;
    this.prev = 0;
  }
}

/** Re-slices an arbitrary sample stream into fixed-size chunks. */
export class PcmChunker {
  private pending = new Int16Array(0);

  constructor(private readonly size: number = VOICE_INPUT_CHUNK_SAMPLES) {}

  push(samples: Int16Array): Int16Array[] {
    const merged = new Int16Array(this.pending.length + samples.length);
    merged.set(this.pending, 0);
    merged.set(samples, this.pending.length);
    const chunks: Int16Array[] = [];
    let offset = 0;
    while (offset + this.size <= merged.length) {
      chunks.push(merged.slice(offset, offset + this.size));
      offset += this.size;
    }
    this.pending = merged.slice(offset);
    return chunks;
  }

  reset() {
    this.pending = new Int16Array(0);
  }
}
