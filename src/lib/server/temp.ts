import "server-only";
import { mkdir, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Conversions run in memory, but anything that ever needs disk (large
// uploads, future engines) goes under this folder, which is swept so no file
// outlives TEMP_FILE_TTL_MINUTES (60 by default, our privacy promise).

export const TEMP_ROOT = join(tmpdir(), "fileflect");

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

export interface TempUsage {
  /** Files (not folders) currently under `root`. */
  files: number;
  bytes: number;
  /** Age of the oldest file, or null when there are none. */
  oldestMs: number | null;
}

/** What is on disk right now under `root` (for the admin panel). */
export async function tempUsage(root = TEMP_ROOT, now = Date.now()): Promise<TempUsage> {
  const usage: TempUsage = { files: 0, bytes: 0, oldestMs: null };
  let entries;
  try {
    entries = await readdir(root, { recursive: true, withFileTypes: true });
  } catch {
    return usage; // Nothing written yet.
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    try {
      const info = await stat(join(entry.parentPath, entry.name));
      usage.files++;
      usage.bytes += info.size;
      const age = Math.max(0, now - info.mtimeMs);
      usage.oldestMs = Math.max(usage.oldestMs ?? 0, age);
    } catch {
      // Removed concurrently: fine.
    }
  }
  return usage;
}
