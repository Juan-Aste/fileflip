// Parallel batch processing without overloading mid-range phones.

/**
 * How many files to convert at once: one core stays free for the page and
 * low-memory devices go one by one (each decoded image can take ~100 MB).
 * Both hints come from `navigator` and may be missing (Safari/Firefox have
 * no `deviceMemory`).
 */
export function batchConcurrency({
  hardwareConcurrency,
  deviceMemory,
}: { hardwareConcurrency?: number; deviceMemory?: number } = {}): number {
  if (deviceMemory !== undefined && deviceMemory <= 2) return 1;
  const cores = hardwareConcurrency && hardwareConcurrency > 0 ? hardwareConcurrency : 2;
  const byCores = Math.max(1, Math.min(4, cores - 1));
  return deviceMemory !== undefined && deviceMemory <= 4 ? Math.min(2, byCores) : byCores;
}

export function deviceConcurrency(): number {
  if (typeof navigator === "undefined") return 1;
  const nav = navigator as Navigator & { deviceMemory?: number };
  return batchConcurrency({ hardwareConcurrency: nav.hardwareConcurrency, deviceMemory: nav.deviceMemory });
}

/** Runs `task` over `items` with at most `limit` in flight, in order of start. */
export async function runLimited<T>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const index = next++;
      await task(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, lane));
}
