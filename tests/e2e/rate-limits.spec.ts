// Request rate limits (6F.3 in PLAN.md): made-up X-Forwarded-For entries
// don't escape the per-IP limit, sign-in links are limited per IP and per
// address, and the sign-in form says so.
import { expect, test } from "./support";

// A fresh address per run, so the limiters of other tests don't interfere.
const ip = (n: number) => `198.51.${100 + (Date.now() % 50)}.${n}`;

test("server conversions: a different made-up first X-Forwarded-For entry per request doesn't escape the limit (B-24)", async ({ request }) => {
  const real = ip(1);
  const statuses: number[] = [];
  for (let i = 0; i < 25; i++) {
    const res = await request.post("/api/convert/markdown", {
      multipart: { to: "pdf" },
      headers: { "x-forwarded-for": `10.${i}.0.1, ${real}` },
    });
    statuses.push(res.status());
  }
  // RATE_LIMIT_PER_MINUTE defaults to 20 anonymous conversions per minute.
  expect(statuses.slice(0, 20)).not.toContain(429);
  expect(statuses.slice(20)).toEqual([429, 429, 429, 429, 429]);
});

test("sign-in links: 5 per IP every 10 minutes, and 5 per address whatever the IP (B-25)", async ({ request }) => {
  const send = (email: string, from: string) =>
    request.post("/api/auth/signin/nodemailer", {
      form: { email, csrfToken: "forged", callbackUrl: "/es" },
      headers: { "x-forwarded-for": from },
      maxRedirects: 0,
    });
  const oneIp = ip(2);
  for (let i = 0; i < 5; i++) expect((await send(`user${i}-${Date.now()}@e2e.test`, oneIp)).status()).not.toBe(429);
  const blocked = await send(`other-${Date.now()}@e2e.test`, oneIp);
  expect(blocked.status()).toBe(429);
  expect(await blocked.json()).toEqual({ error: "rateLimited" });
  expect(Number(blocked.headers()["retry-after"])).toBeGreaterThan(0);

  const victim = `Victim-${Date.now()}@E2E.test`;
  for (let i = 0; i < 5; i++) expect((await send(victim, ip(10 + i))).status()).not.toBe(429);
  expect((await send(victim.toLowerCase(), ip(20))).status()).toBe(429);
});

test("the sign-in form explains the limit", async ({ page }) => {
  await page.route("**/api/auth/csrf", (route) => route.fulfill({ json: { csrfToken: "e2e-token" } }));
  await page.route("**/api/auth/signin/nodemailer", (route) =>
    route.fulfill({ status: 429, json: { error: "rateLimited" }, headers: { "retry-after": "600" } }),
  );
  await page.goto("/es/login", { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: /correo/i }).fill("ana@example.com");
  await page.getByRole("button", { name: /enlace/i }).click();
  await expect(page.getByText("Pediste demasiados enlaces seguidos.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /enlace/i })).toBeEnabled();
});
