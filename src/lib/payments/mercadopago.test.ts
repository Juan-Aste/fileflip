import { afterEach, describe, expect, it, vi } from "vitest";
import { createMercadoPagoProvider, mapPreapprovalStatus, mercadoPagoToken } from "./mercadopago";

const input = {
  userId: "u1",
  email: "ana@example.com",
  region: "AR" as const,
  period: "yearly" as const,
  amount: 45000,
  currency: "ARS",
  reason: "FileFlip Pro anual",
  backUrl: "https://fileflip.app/es/account",
};

describe("Mercado Pago provider", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("creates a preapproval with local currency and returns the checkout URL", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe("https://api.mercadopago.com/preapproval");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer TEST-123");
      expect((init?.headers as Record<string, string>)["X-Idempotency-Key"]).toMatch(/^u1-yearly-/);
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        external_reference: "u1",
        payer_email: "ana@example.com",
        status: "pending",
        auto_recurring: { frequency: 12, frequency_type: "months", transaction_amount: 45000, currency_id: "ARS" },
      });
      return Response.json({ id: "pre-1", status: "pending", init_point: "https://www.mercadopago.com.ar/subscriptions/checkout?x=1" });
    });
    const mp = createMercadoPagoProvider("TEST-123", fetchImpl as typeof fetch);
    expect(await mp.createSubscription(input)).toEqual({
      externalId: "pre-1",
      checkoutUrl: "https://www.mercadopago.com.ar/subscriptions/checkout?x=1",
    });
  });

  it("reads and cancels subscriptions", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url} ${init?.body ?? ""}`);
      return Response.json({ id: "pre-1", status: "authorized", next_payment_date: "2026-11-19T00:00:00.000-03:00" });
    }) as typeof fetch;
    const mp = createMercadoPagoProvider("TEST", fetchImpl);
    const sub = await mp.getSubscription("pre-1");
    expect(sub.status).toBe("active");
    expect(sub.nextPaymentDate?.toISOString()).toBe("2026-11-19T03:00:00.000Z");
    await mp.cancelSubscription("pre-1");
    expect(calls[1]).toBe('PUT https://api.mercadopago.com/preapproval/pre-1 {"status":"cancelled"}');
  });

  it("maps API errors", async () => {
    const mp = createMercadoPagoProvider("TEST", (async () => new Response("bad", { status: 400 })) as typeof fetch);
    await expect(mp.createSubscription(input)).rejects.toMatchObject({ reason: "rejected" });
    const down = createMercadoPagoProvider("TEST", (async () => new Response("", { status: 502 })) as typeof fetch);
    await expect(down.getSubscription("x")).rejects.toMatchObject({ reason: "unavailable" });
  });

  it("maps preapproval statuses", () => {
    expect(mapPreapprovalStatus("authorized")).toBe("active");
    expect(mapPreapprovalStatus("cancelled")).toBe("cancelled");
    expect(mapPreapprovalStatus("paused")).toBe("paused");
    expect(mapPreapprovalStatus("weird")).toBe("pending");
  });

  it("uses per-country credentials with a shared fallback", () => {
    vi.stubEnv("MP_ACCESS_TOKEN", "TEST-shared");
    vi.stubEnv("MP_ACCESS_TOKEN_BR", "TEST-br");
    expect(mercadoPagoToken("BR")).toBe("TEST-br");
    expect(mercadoPagoToken("AR")).toBe("TEST-shared");
  });
});
