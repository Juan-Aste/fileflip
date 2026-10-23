import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const syncSubscription = vi.fn();
vi.mock("@/lib/billing", () => ({ syncSubscription: (id: string) => syncSubscription(id) }));
vi.stubEnv("MP_WEBHOOK_SECRET", "whsec");
vi.stubEnv("PRO_ENABLED", "true");

const { POST } = await import("./route");

function notification(id: string, type: string, { secret = "whsec", ts = Date.now() } = {}) {
  const v1 = createHmac("sha256", secret).update(`id:${id};request-id:req-9;ts:${ts};`).digest("hex");
  return new Request(`https://fileflip.app/api/webhooks/mercadopago?data.id=${id}&type=${type}`, {
    method: "POST",
    headers: { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": "req-9", "content-type": "application/json" },
    body: JSON.stringify({ type, data: { id } }),
  });
}

describe("POST /api/webhooks/mercadopago", () => {
  beforeEach(() => syncSubscription.mockReset().mockResolvedValue(true));

  it("syncs the subscription on a valid preapproval notification", async () => {
    const res = await POST(notification("2c938084abc", "subscription_preapproval"));
    expect(res.status).toBe(200);
    expect(syncSubscription).toHaveBeenCalledWith("2c938084abc");
  });

  it("rejects forged notifications", async () => {
    const res = await POST(notification("2c938084abc", "subscription_preapproval", { secret: "attacker" }));
    expect(res.status).toBe(401);
    expect(syncSubscription).not.toHaveBeenCalled();
  });

  it("acknowledges unrelated topics without doing anything", async () => {
    const res = await POST(notification("123", "payment"));
    expect(res.status).toBe(200);
    expect(syncSubscription).not.toHaveBeenCalled();
  });

  it("acknowledges but changes nothing while Pro is off", async () => {
    vi.stubEnv("PRO_ENABLED", "false");
    const res = await POST(notification("2c938084abc", "subscription_preapproval"));
    vi.stubEnv("PRO_ENABLED", "true");
    expect(res.status).toBe(200);
    expect(syncSubscription).not.toHaveBeenCalled();
    // Forged ones are still refused.
    vi.stubEnv("PRO_ENABLED", "false");
    expect((await POST(notification("2c938084abc", "subscription_preapproval", { secret: "attacker" }))).status).toBe(401);
    vi.stubEnv("PRO_ENABLED", "true");
  });

  it("asks Mercado Pago to retry when syncing fails", async () => {
    syncSubscription.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(notification("2c938084abc", "subscription_preapproval"));
    expect(res.status).toBe(500);
  });
});
