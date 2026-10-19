import "server-only";
import { randomUUID } from "node:crypto";
import type { PaymentProvider } from "./types";

/** Payments are simulated when no real credentials exist (development, demos). */
export function mockPaymentsAllowed() {
  return process.env.PAYMENTS_MOCK === "true" || process.env.NODE_ENV !== "production";
}

/**
 * Fake provider: "checkout" is a local endpoint that activates the
 * subscription right away. Never used when real credentials are configured.
 */
export const mockProvider: PaymentProvider = {
  id: "mock",
  async createSubscription(input) {
    const externalId = `mock-${randomUUID()}`;
    const params = new URLSearchParams({ id: externalId, back: input.backUrl });
    return { externalId, checkoutUrl: `/api/billing/mock-checkout?${params}` };
  },
  async getSubscription(externalId) {
    return { externalId, status: "active" };
  },
  async cancelSubscription() {},
};
