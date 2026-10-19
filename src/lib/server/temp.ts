import "server-only";
import { mkdir, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Conversions run in memory, but anything that ever needs disk (large
// uploads, future engines) goes under this folder, which is swept so no file
// outlives TEMP_FILE_TTL_MINUTES (60 by default, our privacy promise).

export const TEMP_ROOT = join(tmpdir(), "fileflip");

export const ttlMs = () => (Number(process.env.TEMP_FILE_TTL_MINUTES) || 60) * 60_000;

/** Runs `fn` with a private temp directory that is always removed afterwards. */
export async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  await mkdir(TEMP_ROOT, { recursive: true });
  const dir = await mkdtemp(join(TEMP_ROOT, "job-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Deletes entries under `root` older than `maxAgeMs`. Returns how many were removed. */
export async function sweepTempFiles(root = TEMP_ROOT, maxAgeMs = ttlMs(), now = Date.now()): Promise<number> {
  let removed = 0;
  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    return 0; // Nothing written yet.
  }
  for (const name of entries) {
    const path = join(root, name);
    try {
      const info = await stat(path);
      if (now - info.mtimeMs > maxAgeMs) {
        await rm(path, { recursive: true, force: true });
        removed++;
      }
    } catch {
      // Removed concurrently: fine.
    }
  }
  return removed;
}
