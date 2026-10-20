import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { authIndexes, ensureIndexes } from "./indexes";

vi.mock("server-only", () => ({}));

let server: MongoMemoryServer;
let client: MongoClient;

beforeAll(async () => {
  server = await MongoMemoryServer.create();
  client = await MongoClient.connect(server.getUri());
}, 60_000);

afterAll(async () => {
  await client?.close();
  await server?.stop();
});

describe("ensureIndexes", () => {
  it("creates the Auth.js indexes and is idempotent", async () => {
    const db = client.db("idx");
    expect(await ensureIndexes(db)).toBe(0);
    expect(await ensureIndexes(db)).toBe(0);
    const sessions = await db.collection("sessions").indexes();
    expect(sessions.find((i) => i.key.sessionToken === 1)?.unique).toBe(true);
    expect(sessions.find((i) => i.key.expires === 1)?.expireAfterSeconds).toBe(0);
    const total = (await Promise.all(
      ["users", "accounts", "sessions", "verification_tokens"].map((c) => db.collection(c).indexes()),
    )).flat().filter((i) => i.name !== "_id_").length;
    expect(total).toBe(authIndexes.length);
  });

  it("allows users without email but rejects duplicate emails", async () => {
    const db = client.db("idx2");
    await ensureIndexes(db);
    const users = db.collection("users");
    await users.insertMany([{ name: "a" }, { name: "b" }, { email: "x@example.com" }]);
    await expect(users.insertOne({ email: "x@example.com" })).rejects.toThrow(/duplicate/);
  });

  it("reports failures without throwing", async () => {
    const db = client.db("idx3");
    await db.collection("users").insertMany([{ email: "d@example.com" }, { email: "d@example.com" }]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await ensureIndexes(db)).toBe(1);
    warn.mockRestore();
  });
});

describe("model indexes", () => {
  it("Subscription has the lookups used by billing and the admin stats", async () => {
    const { Subscription } = await import("@/models/Subscription");
    const keys = Subscription.schema.indexes().map(([key]) => key);
    expect(keys).toContainEqual({ userId: 1, status: 1, createdAt: -1 });
    expect(keys).toContainEqual({ createdAt: 1 });
    expect(keys).toContainEqual({ externalId: 1 });
  });
});
