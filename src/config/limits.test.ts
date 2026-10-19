import { describe, expect, it } from "vitest";
import { checkLimits, limits } from "./limits";

const MB = 1024 * 1024;

describe("plan limits", () => {
  it("is more generous in the browser than on the server", () => {
    for (const plan of ["free", "pro"] as const) {
      expect(limits[plan].browserMaxFileBytes).toBeGreaterThan(limits[plan].serverMaxFileBytes);
      expect(limits[plan].browserMaxBatch).toBeGreaterThan(limits[plan].serverMaxBatch);
    }
  });

  it("gives Pro larger limits than free", () => {
    expect(limits.pro.serverMaxFileBytes).toBeGreaterThan(limits.free.serverMaxFileBytes);
    expect(limits.pro.serverMaxBatch).toBeGreaterThan(limits.free.serverMaxBatch);
  });

  it("accepts batches within the limits", () => {
    expect(checkLimits([1 * MB, 2 * MB], "server", "free")).toBeNull();
    expect(checkLimits([150 * MB], "browser", "free")).toBeNull();
  });

  it("rejects files that are too large for the engine and plan", () => {
    expect(checkLimits([16 * MB], "server", "free")).toBe("fileTooLarge");
    expect(checkLimits([16 * MB], "server", "pro")).toBeNull();
  });

  it("rejects batches with too many files", () => {
    expect(checkLimits(Array(6).fill(MB), "server", "free")).toBe("tooManyFiles");
    expect(checkLimits(Array(6).fill(MB), "server", "pro")).toBeNull();
    expect(checkLimits(Array(6).fill(MB), "browser", "free")).toBeNull();
  });
});
