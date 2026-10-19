// Runs once when the Next.js server starts.
export async function register() {
  // Node-only code lives in its own module so the edge build never sees it.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
