// Gain for "Normalize volume", from the peak and RMS level measured in a first
// pass over the decoded audio. No mediabunny import.

export const normalizeModes = ["peak", "loudness"] as const;
export type NormalizeMode = (typeof normalizeModes)[number];

/** Peak mode brings the loudest sample here; it's also the ceiling of loudness mode (no clipping). */
export const PEAK_TARGET_DB = -1;
/** Loudness mode aims the average (RMS) level here, about what podcasts and voice use. */
export const RMS_TARGET_DB = -16;
/** Quiet noise isn't raised more than this. */
export const MAX_GAIN_DB = 30;

export interface Levels {
  /** Largest absolute sample, 1 = full scale. */
  peak: number;
  /** Root mean square over every sample of every channel. */
  rms: number;
}

export const toDb = (linear: number) => 20 * Math.log10(linear);
export const fromDb = (db: number) => 10 ** (db / 20);

/** Linear gain to apply, or null when the audio is (practically) silent. */
export function normalizeGain({ peak, rms }: Levels, mode: NormalizeMode): number | null {
  if (!(peak > fromDb(-90)) || !(rms > 0)) return null;
  const ceiling = fromDb(PEAK_TARGET_DB) / peak;
  const gain = mode === "peak" ? ceiling : Math.min(fromDb(RMS_TARGET_DB) / rms, ceiling);
  return Math.min(gain, fromDb(MAX_GAIN_DB));
}

/** Accumulates levels over blocks of float samples. */
export function createLevelMeter() {
  let peak = 0;
  let sum = 0;
  let count = 0;
  return {
    add(block: Float32Array) {
      for (let i = 0; i < block.length; i++) {
        const v = block[i]!;
        const a = Math.abs(v);
        if (a > peak) peak = a;
        sum += v * v;
      }
      count += block.length;
    },
    levels: (): Levels => ({ peak, rms: count ? Math.sqrt(sum / count) : 0 }),
  };
}
