import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ConversionLog } from "@/models/ConversionLog";
import { logConversion, parseConversionEntry } from "./stats";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  vi.stubEnv("MONGODB_URI", mongo.getUri("fileflip-test"));
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
  vi.unstubAllEnvs();
});

describe("logConversion", () => {
  it("stores only metadata", async () => {
    await logConversion({ from: "docx", to: "pdf", engine: "server", size: 1234, outputSize: 999, success: true });
    const docs = await ConversionLog.find().lean();
    expect(docs).toHaveLength(1);
    expect(Object.keys(docs[0]).sort()).toEqual(["_id", "createdAt", "engine", "from", "outputSize", "size", "success", "to"]);
  });

  it("never throws, even with invalid data", async () => {
    await expect(
      logConversion({ from: "nope" as never, to: "pdf", engine: "server", size: -1, success: true }),
    ).resolves.toBeUndefined();
  });
});

describe("parseConversionEntry", () => {
  it("accepts a valid browser payload", () => {
    expect(parseConversionEntry({ from: "heic", to: "jpg", size: 2048.4, outputSize: 1000, success: true })).toEqual({
      from: "heic",
      to: "jpg",
      engine: "browser",
      size: 2048,
      outputSize: 1000,
      success: true,
    });
  });

  it("rejects junk and never trusts an engine or user from the client", () => {
    expect(parseConversionEntry(null)).toBeNull();
    expect(parseConversionEntry({ from: "exe", to: "jpg", size: 1, success: true })).toBeNull();
    expect(parseConversionEntry({ from: "png", to: "jpg", size: -5, success: true })).toBeNull();
    const parsed = parseConversionEntry({ from: "png", to: "jpg", size: 1, success: false, engine: "server", userId: "x" });
    expect(parsed).toMatchObject({ engine: "browser" });
    expect(parsed).not.toHaveProperty("userId");
  });
});
