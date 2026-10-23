import { describe, expect, it } from "vitest";
import { proEnabled } from "./pro";

describe("proEnabled", () => {
  it("is off unless PRO_ENABLED is exactly true", () => {
    expect(proEnabled({})).toBe(false);
    expect(proEnabled({ PRO_ENABLED: "" })).toBe(false);
    expect(proEnabled({ PRO_ENABLED: "false" })).toBe(false);
    expect(proEnabled({ PRO_ENABLED: "1" })).toBe(false);
    expect(proEnabled({ PRO_ENABLED: "true" })).toBe(true);
  });
});
