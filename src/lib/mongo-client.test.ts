import { afterAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getMongoClient } from "./mongo-client";

describe("getMongoClient", () => {
  let server: MongoMemoryServer | undefined;
  afterAll(async () => {
    await (await getMongoClient(uri).catch(() => null))?.close();
    await server?.stop();
  });
  const port = 27_000 + Math.floor(Math.random() * 1000);
  const uri = `mongodb://127.0.0.1:${port}/fileflect-test`;

  it("rejects without MONGODB_URI", async () => {
    await expect(getMongoClient("")).rejects.toThrow("MONGODB_URI is not set");
  });

  it("connects once MongoDB is back after a failed first connection (B-16)", async () => {
    await expect(getMongoClient(uri, 500)).rejects.toThrow();
    server = await MongoMemoryServer.create({ instance: { port } });
    const client = await getMongoClient(uri, 5_000);
    await client.db().collection("sessions").insertOne({ sessionToken: "t" });
    expect(await client.db().collection("sessions").countDocuments()).toBe(1);
    expect(await getMongoClient(uri)).toBe(client);
  }, 60_000);
});
