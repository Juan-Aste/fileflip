import { isApiErrorCode, type ApiErrorCode } from "./api-errors";

/** An account action (checkout, cancelling) gives up after this long. */
export const ACTION_TIMEOUT_MS = 20_000;

export type ActionResult = { ok: true; body: Record<string, unknown> } | { ok: false; code: ApiErrorCode };

/**
 * POSTs to one of our APIs from a button: never throws and never hangs. The
 * error is the API's own code, "connectionLost" offline, and
 * "serviceUnavailable" for proxy pages, network errors and timeouts (B-11).
 */
export async function postAction(url: string, body?: unknown, fetchImpl: typeof fetch = fetch): Promise<ActionResult> {
  // setTimeout rather than AbortSignal.timeout, so tests can fake the clock.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ACTION_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok) return { ok: true, body: json };
    return { ok: false, code: isApiErrorCode(json.error) ? json.error : "serviceUnavailable" };
  } catch {
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    return { ok: false, code: offline ? "connectionLost" : "serviceUnavailable" };
  } finally {
    clearTimeout(timer);
  }
}
