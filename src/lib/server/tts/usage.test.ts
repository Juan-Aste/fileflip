import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryUsageStore, MongoUsageStore, type UsageStore } from "./usage";

async function exercise(store: UsageStore) {
  const nov = new Date("2026-11-15T10:00:00Z");
  expect(await store.reserve(60, 100, nov)).toBe(true);
  expect(await store.reserve(50, 100, nov)).toBe(false);
  expect(await store.reserve(40, 100, nov)).toBe(true);
  expect(await store.reserve(1, 100, nov)).toBe(false);
  expect(await store.reserve(500, 100, new Date("2026-12-01T00:00:00Z"))).toBe(false);
  expect(await store.read(nov)).toEqual({ month: 100, day: 100 });
  await store.release(40, nov);
  expect(await store.read(nov)).toEqual({ month: 60, day: 60 });
  expect(await store.read(new Date("2026-11-16T10:00:00Z"))).toEqual({ month: 60, day: 0 });
  // Next month starts empty.
  expect(await store.reserve(100, 100, new Date("2026-12-01T00:00:00Z"))).toBe(true);
}

describe("MemoryUsageStore", () => {
  it("reserves within the monthly cap, per month and day", async () => {
    await exercise(new MemoryUsageStore());
  });
});

describe("MongoUsageStore", () => {
  let mongo: MongoMemoryServer;
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    vi.stubEnv("MONGODB_URI", mongo.getUri("fileflip-tts"));
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
    vi.unstubAllEnvs();
  });

  it("reserves within the monthly cap, per month and day", async () => {
    await exercise(new MongoUsageStore());
  });

  it("never passes the cap with parallel requests", async () => {
    const store = new MongoUsageStore();
    const when = new Date("2027-01-10T00:00:00Z");
    const results = await Promise.all(Array.from({ length: 30 }, () => store.reserve(10, 100, when)));
    expect(results.filter(Boolean)).toHaveLength(10);
    expect((await store.read(when)).month).toBe(100);
    // Only numbers are stored.
    const docs = await mongoose.connection.db!.collection("ttsusages").find().toArray();
    for (const doc of docs) expect(Object.keys(doc).sort()).toEqual(["_id", "chars"]);
  });
});
