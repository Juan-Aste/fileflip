import { zipSync } from "fflate";

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** Makes names unique like a file manager would: "a.jpg", "a (1).jpg", "a (2).jpg". */
export function uniqueNames(names: readonly string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    let candidate = name;
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    for (let i = 1; used.has(candidate.toLowerCase()); i++) candidate = `${base} (${i})${ext}`;
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

/**
 * Builds a ZIP archive. Converted files are already compressed (JPG, PNG,
 * PDF...), so entries are stored without recompressing: much faster, same size.
 */
export function createZip(entries: readonly ZipEntry[]): Uint8Array {
  const names = uniqueNames(entries.map((e) => e.name));
  const files = Object.fromEntries(entries.map((entry, i) => [names[i], entry.data]));
  return zipSync(files, { level: 0 });
}

export async function zipBlobs(files: readonly { name: string; blob: Blob }[]): Promise<Blob> {
  const entries = await Promise.all(
    files.map(async ({ name, blob }) => ({ name, data: new Uint8Array(await blob.arrayBuffer()) })),
  );
  const zip = createZip(entries);
  return new Blob([zip.slice().buffer], { type: "application/zip" });
}
