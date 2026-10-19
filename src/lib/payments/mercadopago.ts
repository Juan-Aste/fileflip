import "server-only";
import type { MercadoPagoCountry } from "@/config/pricing";
import {
  PaymentProviderError,
  type CreateSubscriptionInput,
  type PaymentProvider,
  type ProviderSubscription,
  type SubscriptionStatus,
} from "./types";

const API = "https://api.mercadopago.com";

/**
 * Each Mercado Pago account charges in its own country's currency, so every
 * country needs its own credentials: MP_ACCESS_TOKEN_AR, MP_ACCESS_TOKEN_BR...
 * MP_ACCESS_TOKEN is the fallback (e.g. a single test account).
 */
export function mercadoPagoToken(country: MercadoPagoCountry): string | undefined {
  return process.env[`MP_ACCESS_TOKEN_${country}`] || process.env.MP_ACCESS_TOKEN || undefined;
}

const STATUS: Record<string, SubscriptionStatus> = {
  pending: "pending",
  authorized: "active",
  paused: "paused",
  cancelled: "cancelled",
};

export function mapPreapprovalStatus(status: string): SubscriptionStatus {
  return STATUS[status] ?? "pending";
}

interface Preapproval {
  id: string;
  status: string;
  init_point?: string;
  next_payment_date?: string;
}

/** Mercado Pago subscriptions without a plan (Preapproval API). */
export function createMercadoPagoProvider(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): PaymentProvider {
  async function request<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(`${API}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(init.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new PaymentProviderError("unavailable", String(error));
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new PaymentProviderError(res.status >= 500 ? "unavailable" : "rejected", `${res.status} ${detail}`);
    }
    return (await res.json()) as T;
  }

  const toSubscription = (p: Preapproval): ProviderSubscription => ({
    externalId: p.id,
    status: mapPreapprovalStatus(p.status),
    nextPaymentDate: p.next_payment_date ? new Date(p.next_payment_date) : undefined,
  });

  return {
    id: "mercadopago",

    async createSubscription(input: CreateSubscriptionInput) {
      const body = {
        reason: input.reason,
        external_reference: input.userId,
        payer_email: input.email,
        back_url: input.backUrl,
        status: "pending",
        auto_recurring: {
          frequency: input.period === "yearly" ? 12 : 1,
          frequency_type: "months",
          transaction_amount: input.amount,
          currency_id: input.currency,
        },
      };
      const created = await request<Preapproval>("/preapproval", {
        method: "POST",
        body: JSON.stringify(body),
        idempotencyKey: `${input.userId}-${input.period}-${Date.now()}`,
      });
      if (!created.init_point) throw new PaymentProviderError("rejected", "No checkout URL returned");
      return { externalId: created.id, checkoutUrl: created.init_point };
    },

    async getSubscription(externalId: string) {
      return toSubscription(await request<Preapproval>(`/preapproval/${encodeURIComponent(externalId)}`));
    },

    async cancelSubscription(externalId: string) {
      await request<Preapproval>(`/preapproval/${encodeURIComponent(externalId)}`, {
        method: "PUT",
        body: JSON.stringify({ status: "cancelled" }),
      });
    },
  };
}
