import "server-only";
import { priceFor, type BillingPeriod, type PricingRegion } from "@/config/pricing";
import type { Plan } from "@/config/limits";
import { connectToDatabase } from "@/lib/db";
import { providerById, providerForRegion } from "@/lib/payments/providers";
import type { SubscriptionStatus } from "@/lib/payments/types";
import { Subscription } from "@/models/Subscription";

export interface StartInput {
  userId: string;
  email: string;
  region: PricingRegion;
  period: BillingPeriod;
  reason: string;
  backUrl: string;
}

/** Creates a pending subscription and returns where to pay. */
export async function startSubscription(input: StartInput): Promise<string> {
  await connectToDatabase();
  const { amount, currency } = priceFor(input.region, input.period);
  const provider = providerForRegion(input.region);
  const { externalId, checkoutUrl } = await provider.createSubscription({ ...input, amount, currency });
  await Subscription.create({
    userId: input.userId,
    provider: provider.id,
    externalId,
    region: input.region,
    period: input.period,
    amount,
    currency,
    status: "pending",
  });
  return checkoutUrl;
}

const addPeriod = (from: Date, period: BillingPeriod) => {
  const d = new Date(from);
  d.setMonth(d.getMonth() + (period === "yearly" ? 12 : 1));
  return d;
};

/** Applies a status reported by the provider (webhook or checkout return). */
export async function applyProviderStatus(
  externalId: string,
  status: SubscriptionStatus,
  nextPaymentDate?: Date,
): Promise<boolean> {
  await connectToDatabase();
  const sub = await Subscription.findOne({ externalId });
  if (!sub) return false;
  const update: Record<string, unknown> = { status };
  if (status === "active") {
    update.currentPeriodEnd = nextPaymentDate ?? addPeriod(new Date(), sub.period as BillingPeriod);
  }
  if (status === "cancelled" && !sub.cancelledAt) update.cancelledAt = new Date();
  await Subscription.updateOne({ _id: sub._id }, update);
  return true;
}

/** The subscription that currently matters for a user (newest non-pending one). */
export async function currentSubscription(userId: string) {
  await connectToDatabase();
  return Subscription.findOne({ userId, status: { $ne: "pending" } })
    .sort({ createdAt: -1 })
    .lean();
}

/** Pro while active, and after cancelling until the paid period ends. */
export function planFromSubscription(
  sub: { status: string; currentPeriodEnd?: Date | null } | null,
  now = new Date(),
): Plan {
  if (!sub) return "free";
  if (sub.status === "active") return "pro";
  const paidUntil = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
  return (sub.status === "cancelled" || sub.status === "paused") && paidUntil && paidUntil > now ? "pro" : "free";
}

export async function planForUser(userId: string | undefined): Promise<Plan> {
  if (!userId || !process.env.MONGODB_URI) return "free";
  try {
    return planFromSubscription(await currentSubscription(userId));
  } catch (error) {
    console.warn("Could not read plan", error);
    return "free";
  }
}

/** Stops future charges; Pro stays until the end of the paid period. */
export async function cancelUserSubscription(userId: string): Promise<boolean> {
  await connectToDatabase();
  const sub = await Subscription.findOne({ userId, status: "active" }).sort({ createdAt: -1 });
  if (!sub) return false;
  await providerById(sub.provider, sub.region as PricingRegion).cancelSubscription(sub.externalId);
  await applyProviderStatus(sub.externalId, "cancelled");
  return true;
}
