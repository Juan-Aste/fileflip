// Finds and decodes a QR code in RGBA pixels (jsQR, Apache-2.0).
import jsQR from "jsqr";

export function decodeQr(data: Uint8ClampedArray, width: number, height: number): string | null {
  // "attemptBoth" also reads light-on-dark codes.
  const found = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
  return found ? found.data : null;
}

/** Sides tried in order: small is fast and forgiving of noise, larger finds small codes in big photos. */
export const READ_SIDES = [1000, 2000, 3200] as const;
