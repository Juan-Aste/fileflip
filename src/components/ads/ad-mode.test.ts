import { describe, expect, it } from "vitest";
import { adMode } from "./ad-mode";

describe("adMode", () => {
  it("never shows ads to Pro users", () => {
    expect(adMode({ client: "ca-pub-1", plan: "pro", loaded: true })).toBe("hidden");
    expect(adMode({ plan: "pro", loaded: true })).toBe("hidden");
  });

  it("keeps the space empty until the session is known", () => {
    expect(adMode({ client: "ca-pub-1", plan: "free", loaded: false })).toBe("reserved");
    expect(adMode({ plan: "free", loaded: false })).toBe("reserved");
  });

  it("shows a placeholder without an AdSense client and the ad otherwise", () => {
    expect(adMode({ plan: "free", loaded: true })).toBe("placeholder");
    expect(adMode({ client: "", plan: "free", loaded: true })).toBe("placeholder");
    expect(adMode({ client: "ca-pub-1", plan: "free", loaded: true })).toBe("ad");
  });
});
