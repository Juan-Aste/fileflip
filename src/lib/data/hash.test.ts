import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { HASH_CHUNK_BYTES, checksumLines, hashAlgorithms, hashInput, matchExpected } from "./hash";

const node = (algorithm: string, bytes: Uint8Array | string) => createHash(algorithm).update(bytes).digest("hex");

describe("hash", () => {
  it("matches the published test vectors", async () => {
    expect(await hashInput("", hashAlgorithms)).toEqual({
      md5: "d41d8cd98f00b204e9800998ecf8427e",
      sha1: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      sha512:
        "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
    });
    expect(await hashInput("abc", hashAlgorithms)).toEqual({
      md5: "900150983cd24fb0d6963f7d28e17f72",
      sha1: "a9993e364706816aba3e25717850c26c9cd0d89d",
      sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      sha512:
        "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
    });
  });

  it("hashes text as UTF-8 and only the chosen algorithms", async () => {
    expect(await hashInput("Olá, 中文 ✓", ["sha256"])).toEqual({ sha256: node("sha256", "Olá, 中文 ✓") });
  });

  it("matches Node's crypto for files read in chunks, reporting progress", async () => {
    const bytes = new Uint8Array(randomBytes(2 * HASH_CHUNK_BYTES + 12_345));
    const progress: number[] = [];
    const digests = await hashInput(new Blob([bytes]), hashAlgorithms, (p) => progress.push(p));
    for (const [algorithm, nodeName] of [["md5", "md5"], ["sha1", "sha1"], ["sha256", "sha256"], ["sha512", "sha512"]] as const) {
      expect(digests[algorithm]).toBe(node(nodeName, bytes));
    }
    expect(progress).toEqual([HASH_CHUNK_BYTES / bytes.length, (2 * HASH_CHUNK_BYTES) / bytes.length, 1]);
    expect(await hashInput(new Blob([]), ["md5"])).toEqual({ md5: "d41d8cd98f00b204e9800998ecf8427e" });
  });

  it("writes BSD tag lines that sha256sum -c reads", () => {
    const digests = { sha256: "ab".repeat(32), md5: "cd".repeat(16) };
    expect(checksumLines("a b.txt", digests)).toEqual([`MD5 (a b.txt) = ${"cd".repeat(16)}`, `SHA256 (a b.txt) = ${"ab".repeat(32)}`]);
    expect(checksumLines("x", { md5: "ab".repeat(16) }, true)).toEqual([`MD5 (x) = ${"AB".repeat(16)}`]);
  });

  it("compares an expected hash by its length, ignoring case and spaces", () => {
    const digests = { md5: "900150983cd24fb0d6963f7d28e17f72", sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" };
    expect(matchExpected(" 900150983CD24FB0D6963F7D28E17F72\n", digests)).toEqual({ algorithm: "md5", matches: true });
    expect(matchExpected("ba7816bf 8f01cfea 414140de 5dae2223 b00361a3 96177a9c b410ff61 f20015ae", digests)).toEqual({
      algorithm: "sha256",
      matches: false,
    });
    // SHA-1 length, but SHA-1 was not computed; not hex; empty.
    expect(matchExpected("a".repeat(40), digests)).toBeUndefined();
    expect(matchExpected("xyz", digests)).toBeUndefined();
    expect(matchExpected("", digests)).toBeUndefined();
  });
});
