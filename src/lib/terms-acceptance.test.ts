import { MongoClient, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TERMS_VERSION } from "@/config/legal";

let mongo: MongoMemoryServer;
let client: MongoClient;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  vi.stubEnv("MONGODB_URI", mongo.getUri("terms-test"));
  client = await new MongoClient(mongo.getUri("terms-test")).connect();
}, 120_000);
afterAll(async () => {
  await client?.close();
  const { getMongoClient } = await import("./mongo-client");
  await (await getMongoClient()).close();
  await mongo?.stop();
  vi.unstubAllEnvs();
});

describe("recordTermsAcceptance", () => {
  it("stores the version and date on an existing user without them, once per version", async () => {
    const { recordTermsAcceptance } = await import("./terms-acceptance");
    const users = client.db().collection("users");
    const _id = new ObjectId();
    await users.insertOne({ _id, email: "old@example.com", emailVerified: null });

    const first = new Date("2026-10-23T10:00:00Z");
    await recordTermsAcceptance(_id.toString(), first);
    expect(await users.findOne({ _id })).toMatchObject({
      email: "old@example.com",
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: first,
    });

    // Signing in again with the same version keeps the original date.
    await recordTermsAcceptance(_id.toString(), new Date("2026-11-01T10:00:00Z"));
    expect((await users.findOne({ _id }))?.termsAcceptedAt).toEqual(first);

    // A newer version is recorded with its own date.
    await users.updateOne({ _id }, { $set: { termsVersion: "2020-01-01" } });
    const later = new Date("2026-12-01T10:00:00Z");
    await recordTermsAcceptance(_id.toString(), later);
    expect(await users.findOne({ _id })).toMatchObject({ termsVersion: TERMS_VERSION, termsAcceptedAt: later });
  });

  it("ignores ids that aren't database ids (JWT sessions)", async () => {
    const { recordTermsAcceptance } = await import("./terms-acceptance");
    await expect(recordTermsAcceptance("not-an-object-id")).resolves.toBeUndefined();
  });
});
