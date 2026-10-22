// Per-image (or per-page) time limit for the OCR tools.

/** A signal that aborts with the user's cancel or, with a TimeoutError, after `ms`. */
export function withTimeout(signal: AbortSignal, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("OCR time limit", "TimeoutError")), ms);
  const cancel = () => controller.abort(signal.reason);
  if (signal.aborted) cancel();
  signal.addEventListener("abort", cancel, { once: true });
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
    },
  };
}
