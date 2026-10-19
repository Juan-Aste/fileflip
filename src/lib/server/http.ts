import "server-only";

/** Content-Disposition with a UTF-8 file name (RFC 6266 / 5987). */
export function attachment(filename: string) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
