import { describe, expect, it } from "vitest";
import { statusCode } from "./server-client";

describe("statusCode (error answers without our JSON body)", () => {
  it("names proxy and outage pages instead of blaming the file", () => {
    expect(statusCode(413)).toBe("fileTooLarge");
    expect(statusCode(429)).toBe("rateLimited");
    for (const status of [502, 503, 504]) expect(statusCode(status)).toBe("serviceUnavailable");
    expect(statusCode(500)).toBe("conversionFailed");
  });
});
