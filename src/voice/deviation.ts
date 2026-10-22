export interface VoiceMetric {
  key: string;
  label: string;
  unit: string;
  digits: number;
}

// Raw phone-microphone measurements. Absolute values are not comparable across people or rooms: only change against
// the same person's own earlier sessions is worth looking at.
export const VOICE_METRICS: VoiceMetric[] = [
  { key: 'f0_mean_hz', label: 'Pitch (mean)', unit: 'Hz', digits: 0 },
  { key: 'f0_sd_st', label: 'Pitch variation', unit: 'st', digits: 2 },
  { key: 'articulation_rate_syl_s', label: 'Speaking rate', unit: 'syl/s', digits: 2 },
  { key: 'pause_ratio', label: 'Pauses', unit: '%', digits: 0 },
  { key: 'loudness_sd_db', label: 'Loudness variation', unit: 'dB', digits: 1 },
  { key: 'jitter_local', label: 'Jitter', unit: '%', digits: 2 },
  { key: 'shimmer_local', label: 'Shimmer', unit: '%', digits: 2 },
  { key: 'hnr_db', label: 'Harmonics-to-noise', unit: 'dB', digits: 1 },
];

// jitter, shimmer and the pause ratio are fractions stored as 0-1; shown as percentages
const PERCENT_KEYS = new Set(['pause_ratio', 'jitter_local', 'shimmer_local']);

export const BASELINE_SESSIONS_NEEDED = 5;
const BASELINE_WINDOW = 10;

export interface DeviationRow {
  key: string;
  label: string;
  unit: string;
  latest: number | null;
  baselineMean: number | null;
  baselineN: number;
  pctChange: number | null;
  z: number | null;
}

export interface Deviation {
  rows: DeviationRow[];
  priorSessions: number;
  calibrating: boolean;
}

type Reportish = { voiceFeatures?: Record<string, unknown> | null };

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const scale = (key: string, v: number) => (PERCENT_KEYS.has(key) ? v * 100 : v);

export function formatMetric(metric: VoiceMetric, value: number | null): string {
  return value === null ? 'n/a' : value.toFixed(metric.digits);
}

/** `reports` newest first. Compares the latest session with the same person's earlier ones. */
export function voiceDeviation(reports: Reportish[]): Deviation {
  const withVoice = reports.filter((r) => r.voiceFeatures && Object.keys(r.voiceFeatures).length > 0);
  const [latest, ...prior] = withVoice;
  const window = prior.slice(0, BASELINE_WINDOW);

  const rows = VOICE_METRICS.map((m): DeviationRow => {
    const latestRaw = num(latest?.voiceFeatures?.[m.key]);
    const latestV = latestRaw === null ? null : scale(m.key, latestRaw);
    const history = window
      .map((r) => num(r.voiceFeatures?.[m.key]))
      .filter((v): v is number => v !== null)
      .map((v) => scale(m.key, v));
    const n = history.length;
    const mean = n ? history.reduce((a, b) => a + b, 0) / n : null;
    const sd = n >= 3 && mean !== null ? Math.sqrt(history.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : null;
    return {
      key: m.key,
      label: m.label,
      unit: m.unit,
      latest: latestV,
      baselineMean: mean,
      baselineN: n,
      pctChange: latestV !== null && mean ? ((latestV - mean) / Math.abs(mean)) * 100 : null,
      z: latestV !== null && mean !== null && sd ? (latestV - mean) / sd : null,
    };
  });

  return { rows, priorSessions: window.length, calibrating: window.length < BASELINE_SESSIONS_NEEDED };
}

/** One metric as shown to a reader (fractions become percentages), from a raw stored value. */
export function displayMetric(metric: VoiceMetric, raw: unknown): string | null {
  const v = num(raw);
  return v === null ? null : formatMetric(metric, scale(metric.key, v));
}
