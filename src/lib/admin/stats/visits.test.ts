import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { resolvePeriod } from "@/lib/admin/period";
import { connectToDatabase } from "@/lib/db";
import { PageView } from "@/models/PageView";
import { LONGTAIL_LIMIT, visitStats } from "./visits";

vi.mock("server-only", () => ({}));

let mongo: MongoMemoryServer;
const now = new Date("2026-10-20T12:00:00Z");
const at = (iso: string) => new Date(iso);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  vi.stubEnv("MONGODB_URI", mongo.getUri("fileflip-admin-visits"));
  await connectToDatabase();
  const day = at("2026-10-19T10:00:00Z");
  await PageView.insertMany([
    { locale: "es", country: "AR", kind: "home", createdAt: day },
    { locale: "es", country: "AR", kind: "longtail", page: "heic-iphone", createdAt: day },
    { locale: "es", country: "MX", kind: "longtail", page: "heic-iphone", createdAt: at("2026-10-20T08:00:00Z") },
    { locale: "pt", country: "BR", kind: "longtail", page: "pdf-gov-br", createdAt: day },
    { locale: "en", kind: "conversion", page: "jpg-webp", createdAt: day },
    { locale: "es", kind: "pricing", createdAt: at("2026-10-14T00:00:00Z") },
    // Previous period.
    { locale: "es", kind: "home", createdAt: at("2026-10-10T00:00:00Z") },
    // Outside.
    { locale: "fr", kind: "home", createdAt: at("2026-09-01T00:00:00Z") },
  ]);
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
  vi.unstubAllEnvs();
});

describe("visitStats", () => {
  it("counts the period per day with the comparison", async () => {
    const stats = await visitStats(resolvePeriod({ period: "7d" }, now));
    expect(stats).toMatchObject({ total: 6, previousTotal: 1, change: 5 });
    expect(stats.perBucket.map((b) => b.count)).toEqual([1, 0, 0, 0, 0, 4, 1]);
  });

  it("groups by language, country (unknown when missing) and page type", async () => {
    const stats = await visitStats(resolvePeriod({ period: "7d" }, now));
    expect(stats.byLocale).toEqual([
      { key: "es", count: 4 },
      { key: "en", count: 1 },
      { key: "pt", count: 1 },
    ]);
    expect(stats.byCountry).toEqual([
      { key: "AR", count: 2 },
      { key: "unknown", count: 2 },
      { key: "BR", count: 1 },
      { key: "MX", count: 1 },
    ]);
    expect(stats.byKind).toContainEqual({ key: "longtail", count: 3 });
  });

  it("ranks the long-tail pages, up to the limit", async () => {
    const { topLongtail } = await visitStats(resolvePeriod({ period: "7d" }, now));
    expect(topLongtail).toEqual([
      { key: "heic-iphone", count: 2 },
      { key: "pdf-gov-br", count: 1 },
    ]);
    await PageView.insertMany(
      Array.from({ length: LONGTAIL_LIMIT + 3 }, (_, i) => ({
        locale: "es",
        kind: "longtail",
        page: `page-${i}`,
        createdAt: at("2025-03-01T00:00:00Z"),
      })),
    );
    const many = await visitStats(resolvePeriod({ period: "custom", from: "2025-03-01", to: "2025-03-01" }, now));
    expect(many.topLongtail).toHaveLength(LONGTAIL_LIMIT);
  });

  it("returns zeros for an empty period", async () => {
    const stats = await visitStats(resolvePeriod({ period: "custom", from: "2020-01-01", to: "2020-01-02" }, now));
    expect(stats).toMatchObject({ total: 0, change: null, byLocale: [], byCountry: [], topLongtail: [] });
  });
});
