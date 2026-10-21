// Random passwords without modulo bias: every character comes from rejection
// sampling over crypto.getRandomValues, and a password that misses one of the
// chosen character sets is drawn again (which keeps the choice uniform among
// the passwords that have them all).

export interface PasswordOptions {
  length: number;
  count: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  /** Leaves out characters that are easy to confuse: I l 1 O 0 o | ` ' " */
  avoidAmbiguous: boolean;
}

export const PASSWORD_LENGTH = { min: 4, max: 128 } as const;
export const MAX_PASSWORDS = 100;

const SETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!#$%&*+-./:;<=>?@^_~()[]{}|`'\",\\",
} as const;
const AMBIGUOUS = new Set("Il1O0o|`'\"");

type SetName = keyof typeof SETS;

/** Uniform integer in [0, max) from 32-bit random values (rejection sampling, no modulo bias). */
export function randomBelow(max: number, random: () => number = cryptoUint32): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  for (;;) {
    const value = random();
    if (value < limit) return value % max;
  }
}

function cryptoUint32(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}

export function passwordSets(options: PasswordOptions): string[] {
  return (Object.keys(SETS) as SetName[])
    .filter((name) => options[name])
    .map((name) => [...SETS[name]].filter((c) => !options.avoidAmbiguous || !AMBIGUOUS.has(c)).join(""));
}

/** Bits of entropy of one password: length × log2(alphabet size). */
export function entropyBits(options: PasswordOptions): number {
  const alphabet = passwordSets(options).join("").length;
  return alphabet > 1 ? Math.floor(clampLength(options.length) * Math.log2(alphabet)) : 0;
}

const clampLength = (length: number) => Math.max(PASSWORD_LENGTH.min, Math.min(PASSWORD_LENGTH.max, Math.floor(length) || 0));

export function generatePasswords(options: PasswordOptions, random: () => number = cryptoUint32): string[] {
  const sets = passwordSets(options);
  if (sets.length === 0) return [];
  const alphabet = sets.join("");
  const length = Math.max(clampLength(options.length), sets.length);
  const count = Math.max(1, Math.min(MAX_PASSWORDS, Math.floor(options.count) || 1));
  return Array.from({ length: count }, () => {
    for (;;) {
      const password = Array.from({ length }, () => alphabet[randomBelow(alphabet.length, random)]).join("");
      if (sets.every((set) => [...password].some((c) => set.includes(c)))) return password;
    }
  });
}
