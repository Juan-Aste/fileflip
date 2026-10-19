import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mercadoPagoWebhookSecrets, verifyMercadoPagoSignature } from "./mp-signature";

const now = 1_760_000_000_000;
const sign = (secret: string, manifest: string) => createHmac("sha256", secret).update(manifest).digest("hex");

describe("verifyMercadoPagoSignature", () => {
  const ts = String(now);
  const v1 = sign("s3cret", `id:abc123;request-id:req-1;ts:${ts};`);
  const base = { signature: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "ABC123", secrets: ["s3cret"] };

  it("accepts a valid signature (lowercasing alphanumeric ids)", () => {
    expect(verifyMercadoPagoSignature(base, { now })).toBe(true);
  });

  it("accepts it if any configured account secret matches", () => {
    expect(verifyMercadoPagoSignature({ ...base, secrets: ["other", "s3cret"] }, { now })).toBe(true);
  });

  it("rejects tampered data, wrong secrets and malformed headers", () => {
    expect(verifyMercadoPagoSignature({ ...base, dataId: "abc124" }, { now })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, requestId: "req-2" }, { now })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, secrets: ["nope"] }, { now })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, secrets: [] }, { now })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, signature: null }, { now })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, signature: "garbage" }, { now })).toBe(false);
  });

  it("rejects old notifications (replays)", () => {
    expect(verifyMercadoPagoSignature(base, { now: now + 60 * 60_000 })).toBe(false);
  });

  it("leaves out missing parts of the manifest", () => {
    const sig = sign("k", `ts:${ts};`);
    expect(
      verifyMercadoPagoSignature({ signature: `ts=${ts},v1=${sig}`, requestId: null, dataId: null, secrets: ["k"] }, { now }),
    ).toBe(true);
  });
});

describe("mercadoPagoWebhookSecrets", () => {
  it("collects the shared and per-country secrets", () => {
    expect(
      mercadoPagoWebhookSecrets({ MP_WEBHOOK_SECRET: "a", MP_WEBHOOK_SECRET_BR: "b", MP_WEBHOOK_SECRET_X: "no", OTHER: "c" }).sort(),
    ).toEqual(["a", "b"]);
  });
});
