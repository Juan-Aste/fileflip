import { describe, expect, it } from "vitest";
import { apiError } from "./api-errors";
import { ConversionError, errorCode, isLoggedByServerCode } from "./convert-error";

describe("errorCode", () => {
  it("keeps known codes and hides unexpected errors behind a generic one", () => {
    expect(errorCode(new ConversionError("rateLimited"))).toBe("rateLimited");
    expect(errorCode(new Error("Out of memory"))).toBe("conversionFailed");
    expect(errorCode("weird")).toBe("conversionFailed");
  });
});

describe("isLoggedByServerCode", () => {
  it("only covers failures the API logs after trying to convert", () => {
    expect(isLoggedByServerCode("conversionFailed")).toBe(true);
    expect(isLoggedByServerCode("pdfHasNoText")).toBe(true);
    expect(isLoggedByServerCode("rateLimited")).toBe(false);
    expect(isLoggedByServerCode("fileTooLarge")).toBe(false);
    expect(new ConversionError("rateLimited").loggedByServer).toBe(false);
  });
});

describe("apiError", () => {
  it("returns a JSON code with a matching HTTP status, never prose", async () => {
    const res = apiError("fileTooLarge");
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "fileTooLarge" });
    expect(apiError("serviceUnavailable").status).toBe(503);
  });
});
