import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies Mercado Pago's `x-signature` header ("ts=...,v1=...") as
 * documented: HMAC-SHA256 over "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 * (parts whose value is missing are left out), keyed with the webhook secret.
 * Rejects notifications older than `maxAgeMs` to limit replays.
 */
export function verifyMercadoPagoSignature(
  {
    signature,
    requestId,
    dataId,
    secrets,
  }: { signature: string | null; requestId: string | null; dataId: string | null; secrets: readonly string[] },
  { now = Date.now(), maxAgeMs = 10 * 60_000 }: { now?: number; maxAgeMs?: number } = {},
): boolean {
  if (!signature || !secrets.length) return false;
  const parts = Object.fromEntries(
    signature.split(",").map((part) => {
      const [k, ...v] = part.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1 || !/^[0-9a-f]+$/i.test(v1)) return false;
  // ts is in milliseconds in current notifications; accept seconds too.
  const tsMs = ts.length <= 10 ? Number(ts) * 1000 : Number(ts);
  if (!Number.isFinite(tsMs) || Math.abs(now - tsMs) > maxAgeMs) return false;

  // Alphanumeric ids are signed in lowercase.
  const id = dataId && /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  let manifest = "";
  if (id) manifest += `id:${id};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;

  const expected = Buffer.from(v1.toLowerCase(), "hex");
  return secrets.some((secret) => {
    const digest = createHmac("sha256", secret).update(manifest).digest();
    return digest.length === expected.length && timingSafeEqual(digest, expected);
  });
}

/** Every configured webhook secret (one per Mercado Pago account). */
export function mercadoPagoWebhookSecrets(env: Record<string, string | undefined> = process.env): string[] {
  return Object.entries(env)
    .filter(([key, value]) => /^MP_WEBHOOK_SECRET(_[A-Z]{2})?$/.test(key) && value)
    .map(([, value]) => value as string);
}
