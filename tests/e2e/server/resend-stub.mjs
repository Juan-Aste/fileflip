// Preloaded into `next start` (NODE_OPTIONS=--import) by login-real.spec.ts:
// requests to Resend's API never leave the machine. Each email is appended
// as one JSON line to RESEND_STUB_FILE and answered like Resend does.
import { appendFileSync } from "node:fs";

const realFetch = globalThis.fetch;
globalThis.fetch = async function fetch(input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith("https://api.resend.com/")) return realFetch(input, init);
  const body = init?.body ?? (await input.text?.());
  appendFileSync(process.env.RESEND_STUB_FILE, JSON.stringify(JSON.parse(String(body))) + "\n");
  return Response.json({ id: "stubbed-email" });
};
