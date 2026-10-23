type Env = Record<string, string | undefined>;

/**
 * The Pro plan (pricing page, checkout, billing APIs, every mention of Pro)
 * is off until the owner can bill: PRO_ENABLED=true turns it on. Read on the
 * server only. Static pages (header, footer, tool pages, sitemap) take the
 * value at build time; Railway rebuilds when a variable changes.
 */
export function proEnabled(env: Env = process.env) {
  return env.PRO_ENABLED === "true";
}

/** What the billing APIs answer while Pro is off: as if they didn't exist. */
export const proDisabledResponse = () => new Response("Not found", { status: 404 });
