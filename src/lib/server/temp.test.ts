import { existsSync } from "node:fs";
import { mkdir, mkdtemp, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sweepTempFiles, tempUsage, withTempDir } from "./temp";

describe("sweepTempFiles", () => {
  it("removes only entries older than the TTL", async () => {
    const root = await mkdtemp(join(tmpdir(), "sweep-"));
    const old = join(root, "old.bin");
    const fresh = join(root, "fresh.bin");
    await writeFile(old, "x");
    await writeFile(fresh, "x");
    await mkdir(join(root, "old-dir"));
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000);
    await utimes(old, twoHoursAgo, twoHoursAgo);
    await utimes(join(root, "old-dir"), twoHoursAgo, twoHoursAgo);

    expect(await sweepTempFiles(root, 60 * 60_000)).toBe(2);
    expect(existsSync(old)).toBe(false);
    expect(existsSync(fresh)).toBe(true);
  });

  it("ignores a missing folder", async () => {
    expect(await sweepTempFiles(join(tmpdir(), "does-not-exist-123"))).toBe(0);
  });
});

describe("withTempDir", () => {
  it("always deletes the directory, even on errors", async () => {
    let dir = "";
    await expect(
      withTempDir(async (d) => {
        dir = d;
        await writeFile(join(d, "upload"), "data");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(existsSync(dir)).toBe(false);
  });
});

describe("tempUsage", () => {
  it("counts files and bytes in nested folders and the oldest age", async () => {
    const root = await mkdtemp(join(tmpdir(), "usage-"));
    await mkdir(join(root, "job-1"));
    await writeFile(join(root, "a.bin"), "abc");
    await writeFile(join(root, "job-1", "b.bin"), "12345");
    const now = Date.now();
    const tenMinutesAgo = new Date(now - 10 * 60_000);
    await utimes(join(root, "job-1", "b.bin"), tenMinutesAgo, tenMinutesAgo);

    const usage = await tempUsage(root, now);
    expect(usage).toMatchObject({ files: 2, bytes: 8 });
    expect(usage.oldestMs).toBeGreaterThanOrEqual(10 * 60_000 - 1000);
  });

  it("reports nothing for a missing folder", async () => {
    expect(await tempUsage(join(tmpdir(), "does-not-exist-456"))).toEqual({ files: 0, bytes: 0, oldestMs: null });
  });
});
