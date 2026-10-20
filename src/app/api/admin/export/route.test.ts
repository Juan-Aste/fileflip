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
const get = (query = "") => GET(new Request(`http://localhost/api/admin/export${query}`));

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  vi.stubEnv("MONGODB_URI", mongo.getUri("fileflip-admin-export"));
  await connectToDatabase();
  await ConversionLog.create([
    { from: "png", to: "webp", engine: "browser", size: 10, success: true },
    { from: "png", to: "webp", engine: "server", size: 10, success: false, errorCode: "conversionFailed" },
    { from: "heic", to: "jpg", engine: "browser", size: 10, success: true },
  ]);
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", "owner@fileflip.app");
});

describe("GET /api/admin/export", () => {
  it("is a 404 for anonymous visitors and non-admins", async () => {
    currentSession = null;
    expect((await get("?table=errors")).status).toBe(404);
    currentSession = session("eve@example.com");
    const res = await get("?table=errors");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "notFound" });
  });

  it("rejects unknown tables", async () => {
    currentSession = session("owner@fileflip.app");
    expect((await get("?table=users")).status).toBe(400);
    expect((await get()).status).toBe(400);
  });

  it("downloads one table of the period as CSV", async () => {
    currentSession = session("owner@fileflip.app");
    const res = await get("?table=top-conversions&period=7d");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="fileflip-top-conversions-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(await res.text()).toBe("tool,from,to,count\r\nconvert,png,webp,2\r\nconvert,heic,jpg,1\r\n");
    const errors = await get("?table=errors&period=7d");
    expect(await errors.text()).toBe("error_code,count\r\nconversionFailed,1\r\n");
  });
});
