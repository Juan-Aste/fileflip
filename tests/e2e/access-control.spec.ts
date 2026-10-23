// Access control (6F.2 in PLAN.md): /admin and its APIs, the billing APIs,
// the simulated checkout and the Mercado Pago webhook refuse whoever has no
// permission or no valid signature, on the real production build.
import { createHmac } from "node:crypto";
import { encode } from "next-auth/jwt";
import { E2E_ADMIN_EMAIL, E2E_AUTH_SECRET } from "./hit-test";
import { expect, test } from "./support";

// Second test server: ADMIN_EMAILS=admin@e2e.test and PAYMENTS_MOCK=true (playwright.config.ts).
const admin = `http://localhost:${Number(process.env.E2E_PORT ?? 3100) + 1}`;

/** Cookie header of a JWT session, as Auth.js issues it over HTTP. */
async function session(email: string, secret = E2E_AUTH_SECRET) {
  const salt = "authjs.session-token";
  return `${salt}=${await encode({ salt, secret, token: { sub: `id-${email}`, email, name: "E2E" } })}`;
}

const adminUrls = ["/es/admin", "/en/admin", "/api/admin/stats?period=7d", "/api/admin/export?table=conversions-per-day&period=7d"];

test("admin pages and APIs are a 404 for anonymous visitors", async ({ request }) => {
  for (const path of adminUrls) {
    expect((await request.get(`${admin}${path}`, { maxRedirects: 0 })).status(), path).toBe(404);
  }
});

test("admin pages and APIs are a 404 for signed-in users who aren't admins, and for forged sessions", async ({ request }) => {
  const cookies = {
    "a regular user": await session("user@e2e.test"),
    "the admin's email signed with another secret": await session(E2E_ADMIN_EMAIL, "not-the-server-secret"),
    "a look-alike of the admin's email": await session("Admin@E2E.test.evil"),
  };
  for (const [who, cookie] of Object.entries(cookies)) {
    for (const path of adminUrls) {
      expect((await request.get(`${admin}${path}`, { headers: { cookie }, maxRedirects: 0 })).status(), `${who}: ${path}`).toBe(404);
    }
  }
  // Control: the real admin session gets in.
  const cookie = await session(E2E_ADMIN_EMAIL);
  expect((await request.get(`${admin}/es/admin`, { headers: { cookie } })).status()).toBe(200);
});

test("billing APIs need a session", async ({ request }) => {
  // Pro is on in the second server; with Pro off they don't exist (pro-switch.spec.ts).
  const subscribe = await request.post(`${admin}/api/billing/subscribe`, { data: { period: "monthly", locale: "es" } });
  expect(subscribe.status()).toBe(401);
  expect(await subscribe.json()).toEqual({ error: "signInRequired" });
  const cancel = await request.post(`${admin}/api/billing/cancel`);
  expect(cancel.status()).toBe(401);
  expect(await cancel.json()).toEqual({ error: "signInRequired" });
});

test("the simulated checkout doesn't exist in production without PAYMENTS_MOCK", async ({ request }) => {
  const res = await request.get("/api/billing/mock-checkout?id=mock-1&back=/es", { maxRedirects: 0 });
  expect(res.status()).toBe(404);
});

test("Mercado Pago webhook refuses unsigned, forged and stale notifications", async ({ request }) => {
  const body = { type: "subscription_preapproval", data: { id: "2c9380848f0d1d7e" } };
  const ts = String(Date.now());
  const sign = (secret: string, t = ts) =>
    `ts=${t},v1=${createHmac("sha256", secret).update(`id:${body.data.id};request-id:req-1;ts:${t};`).digest("hex")}`;
  for (const headers of <Record<string, string>[]>[
    {},
    { "x-signature": "garbage", "x-request-id": "req-1" },
    { "x-signature": `ts=${ts},v1=${"0".repeat(64)}`, "x-request-id": "req-1" },
    // The test servers have no MP_WEBHOOK_SECRET: no secret, nothing is valid.
    { "x-signature": sign(""), "x-request-id": "req-1" },
    { "x-signature": sign("guessed-secret", String(Date.now() - 3600_000)), "x-request-id": "req-1" },
  ]) {
    const res = await request.post("/api/webhooks/mercadopago", { data: body, headers });
    expect(res.status(), JSON.stringify(headers)).toBe(401);
  }
});
