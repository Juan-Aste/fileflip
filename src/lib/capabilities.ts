// Decides whether this device can process a file locally.

const MB = 1024 * 1024;

/** True when the browser has everything the image worker needs. */
export function browserSupportsImaging(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof WebAssembly !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap !== "undefined"
  );
}

/**
 * True in a browser missing what most tools run on (workers, WebAssembly,
 * OffscreenCanvas): an unexpected failure there is the browser's, not the
 * file's. False outside a browser.
 */
export function browserLacksToolFeatures(): boolean {
  if (typeof window === "undefined") return false;
  return typeof Worker === "undefined" || typeof WebAssembly === "undefined" || typeof OffscreenCanvas === "undefined";
}

/**
 * Largest file we try to decode locally. A compressed image can expand ~10×
 * once decoded, so low-memory phones get a smaller budget.
 * `deviceMemory` (GB, rounded down) only exists in Chromium browsers.
 */
export function deviceFileBudget(deviceMemoryGb?: number): number {
  if (deviceMemoryGb === undefined) return 100 * MB;
  if (deviceMemoryGb <= 1) return 20 * MB;
  if (deviceMemoryGb <= 2) return 40 * MB;
  if (deviceMemoryGb <= 4) return 80 * MB;
  return 150 * MB;
}

export function currentDeviceBudget(): number {
  const nav = typeof navigator === "undefined" ? undefined : (navigator as { deviceMemory?: number });
  return deviceFileBudget(nav?.deviceMemory);
}
