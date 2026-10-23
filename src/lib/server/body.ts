import "server-only";

/** Small JSON or form bodies (beacons, billing, webhooks, sign-in). */
export const SMALL_BODY_BYTES = 64 * 1024;

/**
 * Reads a request body up to `maxBytes`, also when the client sends no
 * Content-Length (chunked): beyond it, stops reading and returns null, so a
 * huge or endless body can't fill the server's memory (Railway restarts the
 * app when it runs out).
 */
export async function readBody(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) return null;
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/** A JSON body of at most `maxBytes`: "tooLarge", or the parsed value (undefined if it isn't JSON). */
export async function readJson(request: Request, maxBytes = SMALL_BODY_BYTES): Promise<unknown> {
  const body = await readBody(request, maxBytes);
  if (!body) return TOO_LARGE;
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    return undefined;
  }
}

export const TOO_LARGE = Symbol("tooLarge");
