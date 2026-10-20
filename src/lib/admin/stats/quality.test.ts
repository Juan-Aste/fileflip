import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { resolvePeriod } from "@/lib/admin/period";
import { connectToDatabase } from "@/lib/db";
import { ConversionLog } from "@/models/ConversionLog";
import { qualityStats } from "./quality";

vi.mock("server-only", () => ({}));

let mongo: MongoMemoryServer;
const now = new Date("2026-10-20T12:00:00Z");
const createdAt = new Date("2026-10-19T10:00:00Z");

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  vi.stubEnv("MONGODB_URI", mongo.getUri("fileflip-admin-quality"));
  await connectToDatabase();
  const base = { from: "png", to: "webp", engine: "browser", createdAt } as const;
  await ConversionLog.insertMany([
    { ...base, size: 1000, outputSize: 400, success: true, durationMs: 100 },
    { ...base, size: 2000, outputSize: 600, success: true, durationMs: 300 },
    { ...base, size: 500, success: true }, // no duration (older entry)
    { ...base, engine: "server", from: "docx", to: "pdf", size: 3000, outputSize: 1000, success: true, durationMs: 2000 },
    { ...base, engine: "server", size: 100, success: false, errorCode: "conversionFailed", durationMs: 9999 },
    { ...base, size: 100, outputSize: 50, success: false, errorCode: "conversionFailed" },
    { ...base, engine: "server", size: 100, success: false, errorCode: "serviceUnavailable" },
    { ...base, size: 100, success: false },
    // Outside the period.
    { ...base, size: 1e9, success: false, errorCode: "fileTooLarge", createdAt: new Date("2026-01-01T00:00:00Z") },
  ]);
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
  vi.unstubAllEnvs();
});

describe("qualityStats", () => {
  it("counts failures by error code", async () => {
    const { errors } = await qualityStats(resolvePeriod({ period: "7d" }, now));
    expect(errors).toEqual([
      { code: "conversionFailed", count: 2 },
      { code: "serviceUnavailable", count: 1 },
      { code: "unknown", count: 1 },
    ]);
  });

  it("averages the duration of successful conversions, overall and per engine", async () => {
    const stats = await qualityStats(resolvePeriod({ period: "7d" }, now));
    expect(stats.avgDurationMs).toBe(800);
    expect(stats.avgDurationByEngine).toEqual({ browser: 200, server: 2000 });
  });

  it("sums input bytes of every attempt and output bytes of successes", async () => {
    const stats = await qualityStats(resolvePeriod({ period: "7d" }, now));
    expect(stats.inputBytes).toBe(6900);
    expect(stats.outputBytes).toBe(2000);
  });

  it("returns empty values for a period without data", async () => {
    const stats = await qualityStats(resolvePeriod({ period: "custom", from: "2020-01-01", to: "2020-01-02" }, now));
    expect(stats).toEqual({
      errors: [],
      avgDurationMs: null,
      avgDurationByEngine: { browser: null, server: null },
      inputBytes: 0,
      outputBytes: 0,
    });
  });
});
