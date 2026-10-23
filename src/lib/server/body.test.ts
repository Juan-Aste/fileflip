import { describe, expect, it } from "vitest";
import { readBody, readJson, TOO_LARGE } from "./body";

/** A chunked request (no Content-Length) that would never end on its own. */
function endless(chunk = new Uint8Array(1024)) {
  let pulled = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulled += chunk.byteLength;
      controller.enqueue(chunk);
    },
  });
  return { request: new Request("http://x/api", { method: "POST", body, duplex: "half" } as RequestInit), pulled: () => pulled };
}

describe("readBody", () => {
  it("returns the body when it fits", async () => {
    const body = await readBody(new Request("http://x", { method: "POST", body: "hola" }), 4);
    expect(new TextDecoder().decode(body!)).toBe("hola");
  });

  it("stops reading an endless chunked body past the limit (B-23)", async () => {
    const { request, pulled } = endless();
    expect(await readBody(request, 10 * 1024)).toBeNull();
    expect(pulled()).toBeLessThanOrEqual(12 * 1024);
  });

  it("refuses a declared Content-Length over the limit without reading", async () => {
    const request = new Request("http://x", { method: "POST", body: "x".repeat(10), headers: { "content-length": "10" } });
    expect(await readBody(request, 5)).toBeNull();
  });
});

describe("readJson", () => {
  it("parses, flags bodies over the limit and returns undefined for broken JSON", async () => {
    expect(await readJson(new Request("http://x", { method: "POST", body: '{"a":1}' }))).toEqual({ a: 1 });
    expect(await readJson(endless().request, 1024)).toBe(TOO_LARGE);
    expect(await readJson(new Request("http://x", { method: "POST", body: "{nope" }))).toBeUndefined();
  });
});
