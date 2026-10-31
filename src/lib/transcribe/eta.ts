// Time left of a long job from its progress so far: the rate since the start
// (steadier than the last step's), shown only once there is enough to go on.
// Progress never goes back (Whisper's windows can restart a little earlier).

export interface Eta {
  /** Records progress 0–1 at `now` (ms); returns the progress to show. */
  update(progress: number, now?: number): number;
  /** Seconds left, or null while the estimate would be a guess. */
  secondsLeft(now?: number): number | null;
}

export function createEta(start = Date.now(), { minProgress = 0.03, minMs = 3000 } = {}): Eta {
  let shown = 0;
  let at = start;
  return {
    update(progress, now = Date.now()) {
      if (progress > shown) {
        shown = Math.min(1, progress);
        at = now;
      }
      return shown;
    },
    secondsLeft(now = Date.now()) {
      const elapsed = at - start;
      if (shown >= 1) return 0;
      if (shown < minProgress || elapsed < minMs) return null;
      const left = (elapsed / shown) * (1 - shown) - (now - at);
      return Math.max(1, Math.round(left / 1000));
    },
  };
}
