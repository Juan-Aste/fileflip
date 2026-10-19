import type { BillingPeriod, PaymentProviderId, PricingRegion } from "@/config/pricing";

export type SubscriptionStatus = "pending" | "active" | "paused" | "cancelled";

export interface CreateSubscriptionInput {
  userId: string;
  email: string;
  region: PricingRegion;
  period: BillingPeriod;
  amount: number;
  currency: string;
  /** Localized product name shown on the provider's checkout. */
  reason: string;
  /** Where the provider sends the user back after paying. */
  backUrl: string;
}

export interface ProviderSubscription {
  externalId: string;
  status: SubscriptionStatus;
  nextPaymentDate?: Date;
}

/**
 * A recurring-payments provider. Mercado Pago covers Latin America; the
 * international one (Lemon Squeezy, Paddle...) plugs in behind the same shape.
 */
export interface PaymentProvider {
  id: PaymentProviderId | "mock";
  createSubscription(input: CreateSubscriptionInput): Promise<{ externalId: string; checkoutUrl: string }>;
  getSubscription(externalId: string): Promise<ProviderSubscription>;
  cancelSubscription(externalId: string): Promise<void>;
}

export class PaymentProviderError extends Error {
  constructor(
    readonly reason: "notConfigured" | "rejected" | "unavailable",
    message: string,
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
