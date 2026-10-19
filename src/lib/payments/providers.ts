import "server-only";
import { prices, type PricingRegion } from "@/config/pricing";
import { createMercadoPagoProvider, mercadoPagoToken } from "./mercadopago";
import { mockPaymentsAllowed, mockProvider } from "./mock";
import { PaymentProviderError, type PaymentProvider } from "./types";

/**
 * Provider that charges a region. Mercado Pago for its countries; the
 * international provider is not chosen yet (see PROGRESS.md), so outside
 * Latin America only the mock works until it is.
 */
export function providerForRegion(region: PricingRegion): PaymentProvider {
  if (region !== "INTL" && prices[region].provider === "mercadopago") {
    const token = mercadoPagoToken(region);
    if (token) return createMercadoPagoProvider(token);
  }
  if (region === "INTL" && process.env.INTL_PAYMENT_PROVIDER && process.env.INTL_PAYMENT_PROVIDER !== "none") {
    // Plug Lemon Squeezy / Paddle here, implementing PaymentProvider.
    throw new PaymentProviderError("notConfigured", `Unsupported provider ${process.env.INTL_PAYMENT_PROVIDER}`);
  }
  if (mockPaymentsAllowed()) return mockProvider;
  throw new PaymentProviderError("notConfigured", `No payment provider for ${region}`);
}

/** Provider that owns an existing subscription (for status checks and cancellation). */
export function providerById(id: string, region: PricingRegion): PaymentProvider {
  if (id === "mock") return mockProvider;
  return providerForRegion(region);
}
