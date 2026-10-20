import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { resolvePeriod } from "@/lib/admin/period";
import { connectToDatabase } from "@/lib/db";
import { ConversionLog } from "@/models/ConversionLog";
import { conversionStats } from "./conversions";

vi.mock("server-only", () => ({}));

let mongo: MongoMemoryServer;
const now = new Date("2026-10-20T12:00:00Z");
const at = (iso: string) => new Date(iso);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  vi.stubEnv("MONGODB_URI", mongo.getUri("fileflip-admin-conversions"));
  await connectToDatabase();
  const base = { engine: "browser", size: 100, success: true } as const;
  await ConversionLog.insertMany([
    // Current 7-day period (2026-10-14 .. 2026-10-20).
    { ...base, from: "jpg", to: "webp", createdAt: at("2026-10-20T01:00:00Z") },
    { ...base, from: "jpg", to: "webp", createdAt: at("2026-10-20T23:59:59Z") },
    { ...base, from: "jpg", to: "webp", createdAt: at("2026-10-18T10:00:00Z"), success: false, errorCode: "conversionFailed" },
    { ...base, from: "png", to: "jpg", createdAt: at("2026-10-14T00:00:00Z") },
    { ...base, from: "docx", to: "pdf", engine: "server", createdAt: at("2026-10-15T08:00:00Z") },
    { ...base, from: "pdf", to: "pdf", tool: "merge-pdf", createdAt: at("2026-10-16T08:00:00Z") },
    { ...base, from: "pdf", to: "pdf", tool: "merge-pdf", createdAt: at("2026-10-16T09:00:00Z") },
    // Previous period (2026-10-07 .. 2026-10-13).
    { ...base, from: "png", to: "jpg", createdAt: at("2026-10-13T23:59:59Z") },
    { ...base, from: "png", to: "jpg", createdAt: at("2026-10-07T00:00:00Z") },
    // Outside both.
    { ...base, from: "png", to: "jpg", createdAt: at("2026-10-06T23:59:59Z") },
    { ...base, from: "png", to: "jpg", createdAt: at("2026-10-21T00:00:00Z") },
  ]);
  // An entry logged before the `tool` field existed.
  await ConversionLog.collection.insertOne({ ...base, from: "png", to: "jpg", createdAt: at("2026-10-19T00:00:00Z") });
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
  vi.unstubAllEnvs();
});

describe("conversionStats", () => {
  it("counts the period, failures and the change vs the previous one", async () => {
    const stats = await conversionStats(resolvePeriod({ period: "7d" }, now));
    expect(stats).toMatchObject({ total: 8, succeeded: 7, failed: 1, previousTotal: 2, change: 3 });
  });

  it("groups per UTC day, with empty days as 0", async () => {
    const { perBucket } = await conversionStats(resolvePeriod({ period: "7d" }, now));
    expect(perBucket).toEqual([
      { key: "2026-10-14", total: 1, failed: 0 },
      { key: "2026-10-15", total: 1, failed: 0 },
      { key: "2026-10-16", total: 2, failed: 0 },
      { key: "2026-10-17", total: 0, failed: 0 },
      { key: "2026-10-18", total: 1, failed: 1 },
      { key: "2026-10-19", total: 1, failed: 0 },
      { key: "2026-10-20", total: 2, failed: 0 },
    ]);
  });

  it("groups per month for 12 months", async () => {
    const { perBucket, total } = await conversionStats(resolvePeriod({ period: "12m" }, now));
    expect(perBucket).toHaveLength(12);
    expect(perBucket.at(-1)).toEqual({ key: "2026-10", total: 12, failed: 1 });
    expect(total).toBe(12);
  });

  it("ranks format pairs and PDF tools, and splits browser vs server", async () => {
    const stats = await conversionStats(resolvePeriod({ period: "7d" }, now));
    expect(stats.top).toEqual([
      { tool: "convert", from: "jpg", to: "webp", count: 3 },
      { tool: "convert", from: "png", to: "jpg", count: 2 },
      { tool: "merge-pdf", count: 2 },
      { tool: "convert", from: "docx", to: "pdf", count: 1 },
    ]);
    expect(stats.engines).toEqual({ browser: 7, server: 1 });
  });

  it("limits the ranking to 10", async () => {
    const pairs = ["jpg", "png", "webp", "gif", "avif", "bmp"].flatMap((from) => ["pdf", "heic"].map((to) => ({ from, to })));
    await ConversionLog.insertMany(
      pairs.map((p) => ({ ...p, engine: "browser", size: 1, success: true, createdAt: at("2025-01-01T00:00:00Z") })),
    );
    const { top } = await conversionStats(resolvePeriod({ period: "custom", from: "2025-01-01", to: "2025-01-01" }, now));
    expect(top).toHaveLength(10);
  });

  it("handles an empty period", async () => {
    const empty = await conversionStats(resolvePeriod({ period: "custom", from: "2020-01-01", to: "2020-01-03" }, now));
    expect(empty).toMatchObject({ total: 0, failed: 0, previousTotal: 0, change: null, top: [], engines: { browser: 0, server: 0 } });
    expect(empty.perBucket.map((b) => b.total)).toEqual([0, 0, 0]);
  });
});
