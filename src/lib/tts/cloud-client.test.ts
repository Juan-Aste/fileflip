import { afterEach, describe, expect, it, vi } from "vitest";
import { chunkText, cloudStatus, fetchCloudChunk, inOrder, resetCloudStatus } from "./cloud-client";

afterEach(() => {
  vi.unstubAllGlobals();
  resetCloudStatus();
});

describe("chunkText", () => {
  it("keeps short text whole and cuts long text at spaces", () => {
    expect(chunkText("  Hola mundo.  ")).toEqual(["Hola mundo."]);
    const words = Array.from({ length: 50 }, (_, i) => `palabra${i}`).join(" ");
    const chunks = chunkText(words, 100);
    expect(chunks.every((c) => c.length <= 100)).toBe(true);
    expect(chunks.join(" ")).toBe(words);
    // Without spaces (Chinese), it cuts at the limit, by code points.
    expect(chunkText("字".repeat(250), 100).map((c) => c.length)).toEqual([100, 100, 50]);
    expect(chunkText("😀".repeat(3), 2)).toEqual(["😀😀", "😀"]);
  });
});

describe("inOrder", () => {
  it("runs at most `limit` tasks at once and consumes in order", async () => {
    let running = 0;
    let peak = 0;
    const seen: number[] = [];
    await inOrder(
      7,
      3,
      async (i) => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((r) => setTimeout(r, (7 - i) * 3));
        running--;
        return i * 10;
      },
      async (value) => {
        seen.push(value);
      },
    );
    expect(seen).toEqual([0, 10, 20, 30, 40, 50, 60]);
    expect(peak).toBe(3);
  });

  it("stops at the first failure", async () => {
    const seen: number[] = [];
    await expect(inOrder(5, 2, async (i) => (i === 2 ? Promise.reject(new Error("x")) : i), async (v) => void seen.push(v))).rejects.toThrow("x");
    expect(seen).toEqual([0, 1]);
  });
});

describe("fetchCloudChunk", () => {
  it("asks for a new token once when it expired, and maps error codes", async () => {
    let tokens = 0;
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (!init?.method) return Response.json({ enabled: true, available: true, token: `t${++tokens}` });
      const { token } = JSON.parse(String(init.body));
      if (token === "t1") return Response.json({ error: "ttsTokenExpired" }, { status: 403 });
      if (token === "t2") return new Response(new Uint8Array([1, 2, 3]));
      return Response.json({ error: "ttsDailyLimit" }, { status: 429 });
    });
    vi.stubGlobal("fetch", fetcher);
    expect(new Uint8Array(await fetchCloudChunk("Hola", "es-US-Wavenet-A", 1))).toEqual(new Uint8Array([1, 2, 3]));
    expect(tokens).toBe(2);
    resetCloudStatus();
    await cloudStatus();
    await expect(fetchCloudChunk("Hola", "es-US-Wavenet-A", 1)).rejects.toMatchObject({ code: "ttsDailyLimit" });
  });

  it("marks the cloud voice unavailable at the monthly cap", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method ? Response.json({ error: "ttsMonthlyLimit" }, { status: 503 }) : Response.json({ enabled: true, available: true, token: "t" }),
      ),
    );
    await expect(fetchCloudChunk("Hola", "es-US-Wavenet-A", 1)).rejects.toMatchObject({ code: "ttsMonthlyLimit" });
    expect((await cloudStatus()).available).toBe(false);
  });

  it("is off when the server says so or can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ enabled: false })));
    expect(await cloudStatus()).toEqual({ enabled: false });
    await expect(fetchCloudChunk("Hola", "es-US-Wavenet-A", 1)).rejects.toMatchObject({ code: "serviceUnavailable" });
    resetCloudStatus();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    expect(await cloudStatus()).toEqual({ enabled: false });
  });
});
