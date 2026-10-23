import { afterEach, describe, expect, it, vi } from "vitest";
import { ACTION_TIMEOUT_MS, postAction } from "./post-action";

const answer = (status: number, body: string, type = "application/json") =>
  vi.fn(async () => new Response(body, { status, headers: { "Content-Type": type } })) as unknown as typeof fetch;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("postAction", () => {
  it("returns the body of a success and sends JSON", async () => {
    const fetchImpl = answer(200, '{"url":"https://pay.example/x"}');
    expect(await postAction("/api/billing/subscribe", { period: "monthly" }, fetchImpl)).toEqual({ ok: true, body: { url: "https://pay.example/x" } });
    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"period":"monthly"}');
  });

  it("keeps the API's error code, and calls proxy pages a service outage", async () => {
    expect(await postAction("/x", undefined, answer(503, '{"error":"paymentsUnavailable"}'))).toEqual({ ok: false, code: "paymentsUnavailable" });
    expect(await postAction("/x", undefined, answer(502, "<h1>Bad gateway</h1>", "text/html"))).toEqual({ ok: false, code: "serviceUnavailable" });
  });

  it("says the connection dropped when offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const fetchImpl = vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))) as unknown as typeof fetch;
    expect(await postAction("/x", undefined, fetchImpl)).toEqual({ ok: false, code: "connectionLost" });
  });

  it("gives up after the timeout", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      (_url: string, init: RequestInit) => new Promise<Response>((_, reject) => init.signal!.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))),
    ) as unknown as typeof fetch;
    const result = postAction("/x", undefined, fetchImpl);
    await vi.advanceTimersByTimeAsync(ACTION_TIMEOUT_MS);
    expect(await result).toEqual({ ok: false, code: "serviceUnavailable" });
  });
});
