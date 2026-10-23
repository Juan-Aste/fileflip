import { mercadoPagoCountries } from "@/config/pricing";
import { syncSubscription } from "@/lib/billing";
import { readJson, TOO_LARGE } from "@/lib/server/body";
import { mercadoPagoToken, preapprovalOfAuthorizedPayment } from "@/lib/payments/mercadopago";
import { mercadoPagoWebhookSecrets, verifyMercadoPagoSignature } from "@/lib/payments/mp-signature";

export const runtime = "nodejs";

/**
 * Mercado Pago notifications. The signature is verified, then the
 * subscription is re-read from Mercado Pago (the body is never trusted for
 * the status itself).
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const json = await readJson(request);
  if (json === TOO_LARGE) return new Response("Payload too large", { status: 413 });
  // Some notifications only carry query parameters.
  const body = (json && typeof json === "object" ? json : {}) as { type?: string; data?: { id?: string | number } };
  const dataId = url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null);
  const type = url.searchParams.get("type") ?? body.type ?? "";

  const valid = verifyMercadoPagoSignature({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
    secrets: mercadoPagoWebhookSecrets(),
  });
  if (!valid) return new Response("Invalid signature", { status: 401 });
  if (!dataId) return new Response(null, { status: 200 });

  try {
    if (type === "subscription_preapproval") {
      await syncSubscription(dataId);
    } else if (type === "subscription_authorized_payment") {
      // A recurring charge: find its subscription with any configured account.
      for (const token of new Set(mercadoPagoCountries.map(mercadoPagoToken).filter(Boolean) as string[])) {
        const preapprovalId = await preapprovalOfAuthorizedPayment(token, dataId).catch(() => null);
        if (preapprovalId) {
          await syncSubscription(preapprovalId);
          break;
        }
      }
    }
    // Other topics (payments, plans...) are acknowledged and ignored.
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Mercado Pago webhook failed", error);
    // 5xx makes Mercado Pago retry later.
    return new Response("Error", { status: 500 });
  }
}
