// Security headers and session cookies (6F.1 in PLAN.md, bug B-17): every
// response carries them, other sites can't frame the app, the policy blocks
// nothing the pages use, and Auth.js cookies are HttpOnly, SameSite and,
// behind Railway's HTTPS proxy, Secure.
import { expect, test } from "./support";

const expected = {
  "content-security-policy": "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com",
  "x-frame-options": "SAMEORIGIN",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), usb=()",
  "strict-transport-security": "max-age=31536000",
};

test("pages, APIs and files all carry the security headers", async ({ request }) => {
  const html = await (await request.get("/es")).text();
  const script = html.match(/\/_next\/static\/[^"]+\.js/)![0];
  for (const path of ["/es", "/en/merge-pdf", "/es/precios", "/api/health", "/robots.txt", "/sitemap.xml", "/icon.svg", script, "/es/no-existe"]) {
    const headers = (await request.get(path)).headers();
    for (const [name, value] of Object.entries(expected)) expect(headers[name], `${name} on ${path}`).toBe(value);
  }
});

test("another site can't frame the app (clickjacking)", async ({ page, baseURL }) => {
  await page.setContent(`<iframe src="${baseURL}/es" width="800" height="600"></iframe>`);
  await page.waitForTimeout(1500);
  // The browser shows its own error page in the frame instead of ours.
  const frame = page.frames()[1]!;
  const html = await frame.content().catch(() => "");
  expect(html).not.toContain("Fileflect");
});

test("the policy blocks nothing on the pages", async ({ page }) => {
  const violations: string[] = [];
  await page.exposeFunction("reportViolation", (v: string) => violations.push(v));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) =>
      (window as unknown as { reportViolation: (v: string) => void }).reportViolation(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  for (const path of ["/es", "/es/unir-pdf", "/es/login", "/es/precios", "/es/imagen-a-texto"]) {
    await page.goto(path, { waitUntil: "networkidle" });
  }
  expect(violations).toEqual([]);
});

test("Auth.js cookies are HttpOnly and SameSite, and Secure behind the HTTPS proxy", async ({ request }) => {
  const cookies = async (headers: Record<string, string>) =>
    (await request.get("/api/auth/csrf", { headers })).headersArray().filter((h) => h.name.toLowerCase() === "set-cookie").map((h) => h.value);
  const https = await cookies({ "x-forwarded-proto": "https" });
  expect(https.length).toBeGreaterThan(0);
  for (const cookie of https) {
    expect(cookie).toMatch(/^__(Host|Secure)-authjs\./);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
  }
  // Plain HTTP (local runs): no Secure flag, still HttpOnly.
  for (const cookie of await cookies({})) {
    expect(cookie).toContain("HttpOnly");
    expect(cookie).not.toContain("Secure");
  }
});
