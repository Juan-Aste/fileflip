import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { resolvePeriod } from "@/lib/admin/period";
import { connectToDatabase } from "@/lib/db";
import { ConversionLog } from "@/models/ConversionLog";
import { entryCategory, foldToolRows, toolStats } from "./tools";

vi.mock("server-only", () => ({}));

describe("entryCategory", () => {
  it("uses the registry for tools and the format pair for the converter", () => {
    expect(entryCategory("trim-video")).toBe("video");
    expect(entryCategory("merge-pdf")).toBe("pdf");
    expect(entryCategory("convert", "heic", "jpg")).toBe("image");
    expect(entryCategory("convert", "docx", "pdf")).toBe("document");
    expect(entryCategory("convert", "jpg", "pdf")).toBe("pdf");
    expect(entryCategory("convert", null, null)).toBe("image");
  });
});

describe("foldToolRows", () => {
  it("adds up rows per tool and category and picks the most frequent error", () => {
    const stats = foldToolRows([
      { _id: { tool: "compress-image", error: null }, total: 4, failed: 0 },
      { _id: { tool: "compress-image", error: "fileDamaged" }, total: 1, failed: 1 },
      { _id: { tool: "compress-image", error: "tooLarge" }, total: 2, failed: 2 },
      { _id: { tool: "convert", from: "docx", to: "pdf", error: null }, total: 3, failed: 0 },
      { _id: { tool: "convert", from: "png", to: "jpg", error: "unknown" }, total: 1, failed: 1 },
      { _id: { tool: "trim-audio", error: "fileDamaged" }, total: 1, failed: 1 },
      { _id: { tool: "trim-audio", error: "conversionFailed" }, total: 1, failed: 1 },
    ]);
    expect(stats.byTool).toEqual([
      { tool: "compress-image", total: 7, failed: 3, topError: "tooLarge" },
      { tool: "convert", total: 4, failed: 1, topError: "unknown" },
      // Tie between two codes: alphabetical, so the result does not depend on row order.
      { tool: "trim-audio", total: 2, failed: 2, topError: "conversionFailed" },
    ]);
    expect(stats.byCategory).toEqual([
      { category: "image", total: 8, failed: 4 },
      { category: "document", total: 3, failed: 0 },
      { category: "audio", total: 2, failed: 2 },
    ]);
  });

  it("orders ties by registry order and handles no data", () => {
    const { byTool, byCategory } = foldToolRows([
      { _id: { tool: "trim-video", error: null }, total: 1, failed: 0 },
      { _id: { tool: "merge-pdf", error: null }, total: 1, failed: 0 },
    ]);
    expect(byTool.map((u) => u.tool)).toEqual(["merge-pdf", "trim-video"]);
    expect(byCategory.map((c) => c.category)).toEqual(["pdf", "video"]);
    expect(foldToolRows([])).toEqual({ byTool: [], byCategory: [] });
  });
});

describe("toolStats", () => {
  let mongo: MongoMemoryServer;
  const now = new Date("2026-10-20T12:00:00Z");
  const at = (iso: string) => new Date(iso);

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    vi.stubEnv("MONGODB_URI", mongo.getUri("fileflip-admin-tools"));
    await connectToDatabase();
    const base = { engine: "browser", size: 100, success: true } as const;
    await ConversionLog.insertMany([
      { ...base, from: "jpg", to: "jpg", tool: "compress-image", createdAt: at("2026-10-20T01:00:00Z") },
      { ...base, from: "jpg", to: "jpg", tool: "compress-image", createdAt: at("2026-10-19T01:00:00Z") },
      { ...base, from: "jpg", to: "jpg", tool: "compress-image", success: false, errorCode: "fileDamaged", createdAt: at("2026-10-18T01:00:00Z") },
      { ...base, from: "mp4", to: "mp4", tool: "trim-video", success: false, createdAt: at("2026-10-17T01:00:00Z") },
      { ...base, from: "docx", to: "pdf", engine: "server", createdAt: at("2026-10-16T01:00:00Z") },
      { ...base, from: "heic", to: "jpg", createdAt: at("2026-10-15T01:00:00Z") },
      // Previous period: not counted.
      { ...base, from: "mp4", to: "mp4", tool: "trim-video", createdAt: at("2026-10-10T01:00:00Z") },
    ]);
    // Logged before the `tool` field existed: a format conversion.
    await ConversionLog.collection.insertOne({ ...base, from: "png", to: "pdf", createdAt: at("2026-10-14T01:00:00Z") });
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
    vi.unstubAllEnvs();
  });

  it("aggregates the period per tool and per category", async () => {
    const stats = await toolStats(resolvePeriod({ period: "7d" }, now));
    expect(stats.byTool).toEqual([
      // Same uses: the one with more failures first.
      { tool: "compress-image", total: 3, failed: 1, topError: "fileDamaged" },
      { tool: "convert", total: 3, failed: 0, topError: null },
      { tool: "trim-video", total: 1, failed: 1, topError: "unknown" },
    ]);
    expect(stats.byCategory).toEqual([
      { category: "image", total: 4, failed: 1 },
      { category: "video", total: 1, failed: 1 },
      { category: "pdf", total: 1, failed: 0 },
      { category: "document", total: 1, failed: 0 },
    ]);
  });
});
