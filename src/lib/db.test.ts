import { afterEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { connectToDatabase } from "./db";

describe("connectToDatabase", () => {
  afterEach(() => vi.restoreAllMocks());

  it("throws when no URI is configured", async () => {
    await expect(connectToDatabase("")).rejects.toThrow("MONGODB_URI is not set");
  });

  it("connects once and reuses the cached connection", async () => {
    const spy = vi.spyOn(mongoose, "connect").mockResolvedValue(mongoose);
    const a = await connectToDatabase("mongodb://test/db");
    const b = await connectToDatabase("mongodb://test/db");
    expect(a).toBe(b);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
