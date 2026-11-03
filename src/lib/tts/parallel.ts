// How many AI-voice workers generate sentences at the same time (task 13.1).
// The model runs on one CPU thread per worker (no SharedArrayBuffer: the
// site cannot be cross-origin isolated because of AdSense), at about real
// time on a PC core, so with one worker reading aloud falls behind and
// leaves silences. A computer with spare cores and memory runs two workers,
// each with its own copy of the model (~0.5–0.8 GB more memory); phones and
// small machines keep one. `deviceMemory` only exists in Chromium: elsewhere
// the core count decides.

export function aiVoiceWorkers(nav: (Pick<Navigator, "hardwareConcurrency" | "userAgent"> & { deviceMemory?: number }) | null = typeof navigator === "undefined" ? null : navigator): 1 | 2 {
  if (!nav) return 1;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent)) return 1;
  if ((nav.hardwareConcurrency ?? 1) < 4) return 1;
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 8) return 1;
  return 2;
}
