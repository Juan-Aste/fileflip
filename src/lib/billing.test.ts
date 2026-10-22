import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let mongo: MongoMemoryServer;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  vi.stubEnv("MONGODB_URI", mongo.getUri("billing-test"));
  vi.stubEnv("MP_ACCESS_TOKEN", "");
}, 120_000);
afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
  vi.unstubAllEnvs();
});

const billing = () => import("./billing");
const userId = new mongoose.Types.ObjectId().toString();

describe("planFromSubscription", async () => {
  const { planFromSubscription } = await billing();
  const now = new Date("2026-10-19T00:00:00Z");
  const later = new Date("2026-11-01T00:00:00Z");
  const earlier = new Date("2026-10-01T00:00:00Z");

  it("is Pro while active and free without a subscription", () => {
    expect(planFromSubscription(null, now)).toBe("free");
    expect(planFromSubscription({ status: "active" }, now)).toBe("pro");
    expect(planFromSubscription({ status: "pending" }, now)).toBe("free");
  });

  it("keeps Pro after cancelling until the paid period ends", () => {
    expect(planFromSubscription({ status: "cancelled", currentPeriodEnd: later }, now)).toBe("pro");
    expect(planFromSubscription({ status: "cancelled", currentPeriodEnd: earlier }, now)).toBe("free");
  });
});

describe("subscription lifecycle (mock provider)", () => {
  it("starts pending, activates, and cancels keeping access until period end", async () => {
    const { startSubscription, applyProviderStatus, planForUser, cancelUserSubscription, currentSubscription } =
      await billing();
    const url = await startSubscription({
      userId,
      email: "ana@example.com",
      region: "AR",
      period: "monthly",
      reason: "Fileflect Pro",
      backUrl: "http://localhost/es/account",
    });
    expect(url).toMatch(/^\/api\/billing\/mock-checkout\?id=mock-/);
    expect(await planForUser(userId)).toBe("free");

    const externalId = new URL(url, "http://x").searchParams.get("id")!;
    expect(await applyProviderStatus(externalId, "active")).toBe(true);
    expect(await planForUser(userId)).toBe("pro");
    const active = await currentSubscription(userId);
    expect(active).toMatchObject({ amount: 4500, currency: "ARS", status: "active" });
    expect(active?.currentPeriodEnd?.getTime()).toBeGreaterThan(Date.now());

    expect(await cancelUserSubscription(userId)).toBe(true);
    const cancelled = await currentSubscription(userId);
    expect(cancelled?.status).toBe("cancelled");
    expect(cancelled?.cancelledAt).toBeInstanceOf(Date);
    expect(await planForUser(userId)).toBe("pro");
  });

  it("ignores statuses for unknown subscriptions", async () => {
    const { applyProviderStatus } = await billing();
    expect(await applyProviderStatus("nope", "active")).toBe(false);
  });
});
