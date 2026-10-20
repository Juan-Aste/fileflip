import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PageView } from "@/models/PageView";
import { classifyPath } from "./visits";

describe("classifyPath", () => {
  it("names pages independently of the language", () => {
    expect(classifyPath("/es/jpg-a-webp")).toEqual({ locale: "es", kind: "conversion", page: "jpg-webp" });
    expect(classifyPath("/en/jpg-to-webp")).toEqual({ locale: "en", kind: "conversion", page: "jpg-webp" });
    expect(classifyPath("/es/unir-pdf")).toEqual({ locale: "es", kind: "tool", page: "merge-pdf" });
    expect(classifyPath("/es/heic-a-jpg-desde-iphone")).toEqual({ locale: "es", kind: "longtail", page: "heic-jpg-iphone-es" });
  });

  it("classifies fixed pages and unknown paths", () => {
    expect(classifyPath("/fr")).toEqual({ locale: "fr", kind: "home" });
    expect(classifyPath("/pt/pricing?x=1")).toEqual({ locale: "pt", kind: "pricing" });
    expect(classifyPath("/es/privacy")).toEqual({ locale: "es", kind: "legal" });
    expect(classifyPath("/es/login/verify")).toEqual({ locale: "es", kind: "account" });
    expect(classifyPath("/es/no-existe")).toEqual({ locale: "es", kind: "other" });
    expect(classifyPath("/es/%E0%A4%A")).toEqual({ locale: "es", kind: "other" });
  });

  it("ignores admin pages, unknown locales and junk", () => {
    expect(classifyPath("/es/admin")).toBeNull();
    expect(classifyPath("/de/pricing")).toBeNull();
    expect(classifyPath(42)).toBeNull();
    expect(classifyPath("/es/" + "a".repeat(400))).toBeNull();
  });
});

describe("POST /api/visit", () => {
  let mongo: MongoMemoryServer;
  let POST: (r: Request) => Promise<Response>;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    vi.stubEnv("MONGODB_URI", mongo.getUri("fileflip-visits"));
    ({ POST } = await import("@/app/api/visit/route"));
    const { connectToDatabase } = await import("@/lib/db");
    await connectToDatabase();
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    await PageView.deleteMany({});
  });

  const visit = (body: string, headers: Record<string, string> = {}) =>
    POST(new Request("http://localhost/api/visit", { method: "POST", body, headers: { "x-forwarded-for": "10.0.0.1", ...headers } }));

  it("stores language, country and page, never the IP or the URL", async () => {
    const res = await visit(JSON.stringify({ path: "/es/jpg-a-webp" }), { "cf-ipcountry": "ar" });
    expect(res.status).toBe(204);
    const docs = await PageView.find().lean();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ locale: "es", country: "AR", kind: "conversion", page: "jpg-webp" });
    expect(Object.keys(docs[0]).sort()).toEqual(["_id", "country", "createdAt", "kind", "locale", "page"]);
    expect(JSON.stringify(docs)).not.toContain("10.0.0.1");
  });

  it("skips the country when the CDN does not know it, and does not count admin pages", async () => {
    await visit(JSON.stringify({ path: "/en" }), { "cf-ipcountry": "XX" });
    await visit(JSON.stringify({ path: "/es/admin" }));
    const docs = await PageView.find().lean();
    expect(docs).toHaveLength(1);
    expect(docs[0]).not.toHaveProperty("country");
  });

  it("rejects invalid bodies", async () => {
    expect((await visit("not json")).status).toBe(400);
  });
});
