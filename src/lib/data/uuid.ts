// UUID generation (RFC 9562): v4 is fully random, v7 starts with the Unix
// time in milliseconds so the ids sort by creation time.

export type UuidVersion = "v4" | "v7";

export interface UuidOptions {
  version: UuidVersion;
  count: number;
  upperCase: boolean;
  hyphens: boolean;
}

export const MAX_UUIDS = 10_000;

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

function format(bytes: Uint8Array, { upperCase, hyphens }: Pick<UuidOptions, "upperCase" | "hyphens">): string {
  const h = hex(bytes);
  const id = hyphens ? `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}` : h;
  return upperCase ? id.toUpperCase() : id;
}

function v4(random: Uint8Array): Uint8Array {
  random[6] = (random[6]! & 0x0f) | 0x40;
  random[8] = (random[8]! & 0x3f) | 0x80;
  return random;
}

/**
 * v7 with a 12-bit counter in rand_a (RFC 9562, method 1): ids made in the
 * same millisecond still sort in the order they were made. The counter
 * starts at a random value below 2048 so it rarely overflows; if it does,
 * the timestamp moves forward by one millisecond.
 */
function v7Batch(count: number, now: number, randomBytes: (n: number) => Uint8Array): Uint8Array[] {
  const out: Uint8Array[] = [];
  let ms = now;
  let counter = randomBytes(2).reduce((a, b) => (a << 8) | b, 0) & 0x7ff;
  for (let i = 0; i < count; i++) {
    if (i > 0 && ++counter > 0xfff) {
      ms++;
      counter = randomBytes(2).reduce((a, b) => (a << 8) | b, 0) & 0x7ff;
    }
    const bytes = randomBytes(16);
    // 48-bit big-endian timestamp (exact with Math.floor: 2^48 ms is far beyond 2^53).
    for (let b = 5, t = ms; b >= 0; b--, t = Math.floor(t / 256)) bytes[b] = t % 256;
    bytes[6] = 0x70 | (counter >> 8);
    bytes[7] = counter & 0xff;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    out.push(bytes);
  }
  return out;
}

const cryptoRandom = (n: number) => crypto.getRandomValues(new Uint8Array(n));

export function generateUuids(
  options: UuidOptions,
  now: number = Date.now(),
  randomBytes: (n: number) => Uint8Array = cryptoRandom,
): string[] {
  const count = Math.max(1, Math.min(MAX_UUIDS, Math.floor(options.count) || 1));
  const raw = options.version === "v7" ? v7Batch(count, now, randomBytes) : Array.from({ length: count }, () => v4(randomBytes(16)));
  return raw.map((bytes) => format(bytes, options));
}
