import { describe, expect, it, vi } from "vitest";

vi.stubEnv("RATE_LIMIT_PER_MINUTE", "2");
const { readUpload } = await import("./upload");

const rtf = () => {
  const form = new FormData();
  form.append("file", new Blob(["{\\rtf1 hi}"]), "a.rtf");
  form.append("to", "pdf");
  return new Request("http://x/api", { method: "POST", body: form, headers: { "x-forwarded-for": "203.0.113.9" } });
};
const allowAll = () => true;

describe("readUpload rate limiting", () => {
  it("returns 429 with Retry-After once an IP exceeds the limit", async () => {
    expect(await readUpload(rtf(), "free", allowAll)).not.toBeInstanceOf(Response);
    expect(await readUpload(rtf(), "free", allowAll)).not.toBeInstanceOf(Response);
    const blocked = await readUpload(rtf(), "free", allowAll);
    expect(blocked).toBeInstanceOf(Response);
    expect((blocked as Response).status).toBe(429);
    expect(Number((blocked as Response).headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("limits signed-in users per account, more loosely (5×) and apart from their IP", async () => {
    for (let i = 0; i < 10; i++) expect(await readUpload(rtf(), "pro", allowAll, { userId: "u1" })).not.toBeInstanceOf(Response);
    expect(((await readUpload(rtf(), "pro", allowAll, { userId: "u1" })) as Response).status).toBe(429);
    expect(await readUpload(rtf(), "pro", allowAll, { userId: "u2" })).not.toBeInstanceOf(Response);
  });
});
