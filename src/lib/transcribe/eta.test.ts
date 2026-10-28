import { describe, expect, it } from "vitest";
import { createEta } from "./eta";

describe("time left", () => {
  it("waits for enough progress and time before estimating", () => {
    const eta = createEta(0);
    eta.update(0.01, 1000);
    expect(eta.secondsLeft(1000)).toBeNull();
    eta.update(0.5, 2000);
    expect(eta.secondsLeft(2000)).toBeNull();
  });

  it("extrapolates the average rate and counts down between updates", () => {
    const eta = createEta(0);
    eta.update(0.25, 10_000);
    expect(eta.secondsLeft(10_000)).toBe(30);
    expect(eta.secondsLeft(15_000)).toBe(25);
    eta.update(1, 40_000);
    expect(eta.secondsLeft(40_000)).toBe(0);
  });

  it("never shows progress going back", () => {
    const eta = createEta(0);
    expect(eta.update(0.4, 5000)).toBe(0.4);
    expect(eta.update(0.35, 6000)).toBe(0.4);
    expect(eta.update(0.6, 7000)).toBe(0.6);
  });
});
