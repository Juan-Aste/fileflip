// Checksums of text (as UTF-8) and files, read in chunks so a file of any
// size the plan allows is hashed without holding it whole in memory.
import { createMD5, createSHA1, createSHA256, createSHA512, type IHasher } from "hash-wasm";

export const hashAlgorithms = ["md5", "sha1", "sha256", "sha512"] as const;
export type HashAlgorithm = (typeof hashAlgorithms)[number];

/** Names as written by `shasum --tag` / `md5 -r` (BSD style), which `sha256sum -c` also reads. */
export const hashLabels: Record<HashAlgorithm, string> = { md5: "MD5", sha1: "SHA1", sha256: "SHA256", sha512: "SHA512" };

const hexLength: Record<HashAlgorithm, number> = { md5: 32, sha1: 40, sha256: 64, sha512: 128 };

const create: Record<HashAlgorithm, () => Promise<IHasher>> = {
  md5: createMD5,
  sha1: createSHA1,
  sha256: createSHA256,
  sha512: createSHA512,
};

export const HASH_CHUNK_BYTES = 4 * 1024 * 1024;

/** Lower-case hex digests of the input for each algorithm, in one pass over the bytes. */
export async function hashInput(
  input: Blob | Uint8Array | string,
  algorithms: readonly HashAlgorithm[],
  onProgress: (progress: number) => void = () => {},
): Promise<Partial<Record<HashAlgorithm, string>>> {
  const chosen = hashAlgorithms.filter((a) => algorithms.includes(a));
  const hashers = await Promise.all(chosen.map(async (a) => (await create[a]()).init()));
  const update = (bytes: Uint8Array) => hashers.forEach((h) => h.update(bytes));

  if (typeof input === "string") update(new TextEncoder().encode(input));
  else if (input instanceof Uint8Array) update(input);
  else {
    for (let offset = 0; offset < input.size; offset += HASH_CHUNK_BYTES) {
      update(new Uint8Array(await input.slice(offset, offset + HASH_CHUNK_BYTES).arrayBuffer()));
      onProgress(Math.min(1, (offset + HASH_CHUNK_BYTES) / input.size));
    }
  }
  return Object.fromEntries(chosen.map((a, i) => [a, hashers[i]!.digest("hex")]));
}

/** Checksum file in BSD tag style: "SHA256 (photo.jpg) = 9f86…". */
export function checksumLines(name: string, digests: Partial<Record<HashAlgorithm, string>>, upperCase = false): string[] {
  return hashAlgorithms
    .filter((a) => digests[a] !== undefined)
    .map((a) => `${hashLabels[a]} (${name}) = ${upperCase ? digests[a]!.toUpperCase() : digests[a]}`);
}

/**
 * Which digest an expected hash matches, comparing hex without case or
 * spaces. Returns the algorithm, `null` when it matches none, or
 * `undefined` when nothing was given or it is not a hex digest we compute.
 */
export function matchExpected(
  expected: string,
  digests: Partial<Record<HashAlgorithm, string>>,
): { algorithm: HashAlgorithm; matches: boolean } | undefined {
  const clean = expected.replace(/\s+/g, "").toLowerCase();
  if (!/^[0-9a-f]+$/.test(clean)) return undefined;
  const algorithm = hashAlgorithms.find((a) => hexLength[a] === clean.length);
  if (!algorithm || digests[algorithm] === undefined) return undefined;
  return { algorithm, matches: digests[algorithm] === clean };
}
