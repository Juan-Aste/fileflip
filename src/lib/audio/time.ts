// Times typed by the user for the audio tools ("1:23.4", "83,4", "0:01:23")
// and the gain curves applied while encoding. No mediabunny import.

/** Seconds from "ss", "mm:ss" or "hh:mm:ss", with an optional decimal part (dot or comma); null if invalid. */
export function parseTime(text: string): number | null {
  const parts = text.trim().replace(",", ".").split(":");
  if (parts.length > 3 || parts.some((p) => p === "")) return null;
  const last = parts.pop()!;
  if (!/^\d+(\.\d+)?$/.test(last) || !parts.every((p) => /^\d+$/.test(p))) return null;
  const seconds = Number(last);
  // Minutes and seconds after a colon stay below 60 ("1:75" is a typo, not 2:15).
  if (parts.length > 0 && seconds >= 60) return null;
  if (parts.length === 2 && Number(parts[1]) >= 60) return null;
  return parts.reduce((total, p, i) => total + Number(p) * 60 ** (parts.length - i), 0) + seconds;
}

/** "m:ss.d", or "h:mm:ss.d" from one hour; tenths of a second. */
export function formatTime(seconds: number): string {
  const tenths = Math.round(Math.max(0, seconds) * 10);
  const h = Math.floor(tenths / 36000);
  const m = Math.floor((tenths % 36000) / 600);
  const s = (tenths % 600) / 10;
  const ss = s.toFixed(1).padStart(4, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export interface TrimRange {
  start: number;
  end: number;
}

/** A selection is usable when it lies inside the audio and lasts at least a tenth of a second. */
export function validRange(range: TrimRange, duration: number): boolean {
  return range.start >= 0 && range.end <= duration + 0.05 && range.end - range.start >= 0.1;
}

/** Fades never take more than half of the result each, so they can't overlap. */
export function fadeLengths(total: number, fadeIn: number, fadeOut: number) {
  return { fadeIn: Math.min(fadeIn, total / 2), fadeOut: Math.min(fadeOut, total / 2) };
}

/** Gain at `t` seconds of a `total`-second result with linear fades in and out. */
export function fadeGain(t: number, total: number, fadeIn: number, fadeOut: number): number {
  let gain = 1;
  if (fadeIn > 0 && t < fadeIn) gain = Math.max(0, t / fadeIn);
  if (fadeOut > 0 && t > total - fadeOut) gain = Math.min(gain, Math.max(0, (total - t) / fadeOut));
  return gain;
}
