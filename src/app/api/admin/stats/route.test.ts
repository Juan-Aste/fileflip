import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let currentSession: unknown = null;
vi.mock("@/auth", () => ({ auth: async () => currentSession }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("server-only", () => ({}));

const { GET } = await import("./route");
const { ConversionLog } = await import("@/models/ConversionLog");
const { connectToDatabase } = await import("@/lib/db");

const session = (email: string) => ({ user: { id: "u1", email, plan: "free" }, expires: "2099-01-01" });
const get = (query = "") => GET(new Request(`http://localhost/api/admin/stats${query}`));

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  vi.stubEnv("MONGODB_URI", mongo.getUri("fileflip-admin-api"));
  await connectToDatabase();
  await ConversionLog.create({ from: "png", to: "webp", engine: "browser", size: 10, success: true });
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", "owner@fileflip.app");
});

describe("GET /api/admin/stats", () => {
  it("is a 404 for anonymous visitors and non-admins", async () => {
    currentSession = null;
    expect((await get()).status).toBe(404);
    currentSession = session("eve@example.com");
    const res = await get();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "notFound" });
  });

  it("returns the stats of the chosen period to an admin", async () => {
    currentSession = session("owner@fileflip.app");
    const res = await get("?period=7d");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.period).toMatchObject({ preset: "7d", bucket: "day" });
    expect(body.stats.conversions).toMatchObject({ total: 1 });
    expect(body.stats.conversions.perBucket).toHaveLength(7);
    expect(Object.keys(body.stats).sort()).toEqual(["accounts", "conversions", "quality", "temp", "visits"]);
  });
});
