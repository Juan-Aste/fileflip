import { beforeEach, describe, expect, it, vi } from "vitest";

let currentSession: unknown = null;
vi.mock("@/auth", () => ({ auth: async () => currentSession }));

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

const { isAdminEmail, parseAdminEmails, requireAdminApi, requireAdminPage } = await import("./access");

const session = (email: string) => ({ user: { id: "u1", email, plan: "free" }, expires: "2099-01-01" });

describe("admin emails", () => {
  it("parses a comma-separated list, ignoring case and blanks", () => {
    expect([...parseAdminEmails(" Ana@Example.com, ,bob@x.io ")]).toEqual(["ana@example.com", "bob@x.io"]);
    expect(parseAdminEmails(undefined).size).toBe(0);
  });

  it("matches emails case-insensitively and never matches empty values", () => {
    expect(isAdminEmail("ANA@example.com", "ana@example.com")).toBe(true);
    expect(isAdminEmail("eve@example.com", "ana@example.com")).toBe(false);
    expect(isAdminEmail("", "")).toBe(false);
    expect(isAdminEmail(null, "ana@example.com")).toBe(false);
  });
});

describe("admin access", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", "owner@fileflip.app");
    notFound.mockClear();
  });

  it("lets an admin in", async () => {
    currentSession = session("Owner@FileFlip.app");
    await expect(requireAdminPage()).resolves.toMatchObject({ user: { email: "Owner@FileFlip.app" } });
    const api = await requireAdminApi();
    expect("session" in api).toBe(true);
  });

  it("answers 404 to a signed-in user who is not an admin", async () => {
    currentSession = session("user@example.com");
    await expect(requireAdminPage()).rejects.toThrow("NEXT_NOT_FOUND");
    const api = await requireAdminApi();
    expect("response" in api && api.response.status).toBe(404);
  });

  it("answers 404 to anonymous visitors", async () => {
    currentSession = null;
    await expect(requireAdminPage()).rejects.toThrow("NEXT_NOT_FOUND");
    const api = await requireAdminApi();
    expect("response" in api && api.response.status).toBe(404);
  });

  it("denies everyone when ADMIN_EMAILS is not set", async () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    currentSession = session("owner@fileflip.app");
    await expect(requireAdminPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
