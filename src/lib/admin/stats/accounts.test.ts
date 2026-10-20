import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { resolvePeriod } from "@/lib/admin/period";
import { connectToDatabase } from "@/lib/db";
import { Subscription } from "@/models/Subscription";
import { accountStats } from "./accounts";

vi.mock("server-only", () => ({}));

let mongo: MongoMemoryServer;
const now = new Date("2026-10-20T12:00:00Z");
const at = (iso: string) => new Date(iso);
const userAt = (iso: string) => ({
  _id: mongoose.Types.ObjectId.createFromTime(at(iso).getTime() / 1000),
  email: `${iso}@example.com`,
});

let n = 0;
const sub = (fields: Record<string, unknown>) => ({
  userId: new mongoose.Types.ObjectId(),
  provider: "mock",
  externalId: `sub-${n++}`,
  region: "AR",
  period: "monthly",
  amount: 4500,
  currency: "ARS",
  ...fields,
});

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  vi.stubEnv("MONGODB_URI", mongo.getUri("fileflip-admin-accounts"));
  const { connection } = await connectToDatabase();
  await connection.collection("users").insertMany([
    userAt("2026-10-14T00:00:00Z"),
    userAt("2026-10-20T08:00:00Z"),
    userAt("2026-10-20T09:00:00Z"),
    userAt("2026-10-10T00:00:00Z"), // previous period
    userAt("2026-01-01T00:00:00Z"), // older
  ]);
  const inPeriod = at("2026-10-15T00:00:00Z");
  const before = at("2026-08-01T00:00:00Z");
  await Subscription.collection.insertMany([
    sub({ status: "active", createdAt: inPeriod }),
    sub({ status: "active", period: "yearly", amount: 45000, createdAt: before }),
    sub({ status: "active", region: "INTL", currency: "USD", amount: 4.99, createdAt: before }),
    sub({ status: "active", region: "INTL", currency: "USD", period: "yearly", amount: 49, createdAt: before }),
    sub({ status: "pending", createdAt: inPeriod }),
    sub({ status: "cancelled", createdAt: before, cancelledAt: at("2026-10-18T00:00:00Z") }),
    sub({ status: "cancelled", createdAt: before, cancelledAt: at("2026-09-01T00:00:00Z") }),
    sub({ status: "paused", createdAt: inPeriod }),
  ]);
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
  vi.unstubAllEnvs();
});

describe("accountStats", () => {
  it("counts users and new users per day from their id", async () => {
    const stats = await accountStats(resolvePeriod({ period: "7d" }, now));
    expect(stats).toMatchObject({ totalUsers: 5, newUsers: 3, previousNewUsers: 1, change: 2 });
    expect(stats.newUsersPerBucket.map((b) => b.count)).toEqual([1, 0, 0, 0, 0, 0, 2]);
    expect(stats.newUsersPerBucket[0].key).toBe("2026-10-14");
  });

  it("counts active subscriptions, sign-ups and cancellations", async () => {
    const stats = await accountStats(resolvePeriod({ period: "7d" }, now));
    expect(stats).toMatchObject({ activeSubscriptions: 4, newSubscriptions: 2, cancellations: 1 });
  });

  it("computes MRR per currency, yearly plans divided by 12", async () => {
    const { mrr } = await accountStats(resolvePeriod({ period: "7d" }, now));
    expect(mrr).toEqual([
      { currency: "ARS", amount: 8250, subscriptions: 2 },
      { currency: "USD", amount: 9.07, subscriptions: 2 },
    ]);
  });

  it("returns zeros for an empty period", async () => {
    const stats = await accountStats(resolvePeriod({ period: "custom", from: "2020-01-01", to: "2020-01-02" }, now));
    expect(stats).toMatchObject({ newUsers: 0, previousNewUsers: 0, change: null, newSubscriptions: 0, cancellations: 0 });
    expect(stats.totalUsers).toBe(5);
  });
});
