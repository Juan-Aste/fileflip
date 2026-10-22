import { describe, expect, it } from "vitest";
import { adsTxt } from "./ads-txt";

describe("ads.txt", () => {
  it("declares the AdSense publisher from the client id", () => {
    expect(adsTxt("ca-pub-1234567890123456")).toBe("google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
    expect(adsTxt(" pub-42 ")).toBe("google.com, pub-42, DIRECT, f08c47fec0942fa0\n");
  });

  it("has no file without a valid client id", () => {
    expect(adsTxt(undefined)).toBeNull();
    expect(adsTxt("")).toBeNull();
    expect(adsTxt("ca-pub-xyz")).toBeNull();
  });
});
