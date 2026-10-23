// The Pro plan is hidden until the owner can bill (7.2 in PLAN.md): with
// PRO_ENABLED off (the default, and the main test server) there is no
// pricing page, link, billing API or mention of Pro, and everyone is on the
// free plan. billing-states.spec.ts covers the switch on (second server).
import type { ChildProcess } from "node:child_process";
import { MongoClient, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { startApp } from "./server/app";
import { expect, test } from "./support";

const pro = /\bPro\b|专业版/;
const locales = ["es", "en", "pt", "fr", "zh"];

test.describe("Pro off", () => {
  test("no pricing link or mention of Pro in the header, footer, home, tools and login", async ({ page }) => {
    for (const locale of locales) {
      await page.goto(`/${locale}`);
      await expect(page.locator('a[href$="/pricing"]')).toHaveCount(0);
      expect(await page.locator("body").innerText(), locale).not.toMatch(pro);
    }
    for (const path of ["/es/convertir-audio", "/en/audio-converter", "/zh/audio-converter", "/es/unir-pdf", "/fr/convertir-audio", "/pt/converter-audio", "/en/epub-to-pdf", "/es/login"]) {
      await page.goto(path);
      await expect(page.locator('a[href$="/pricing"]')).toHaveCount(0);
      // Closed FAQ answers too: textContent includes hidden text.
      expect(await page.locator("main").textContent(), path).not.toMatch(pro);
    }
  });

  test("no pricing link in the mobile menu", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/es");
    await page.getByRole("button", { name: /menú/i }).click();
    await expect(page.getByRole("dialog").getByRole("link", { name: "Precios" })).toHaveCount(0);
    await expect(page.locator('a[href$="/pricing"]')).toHaveCount(0);
  });

  test("the pricing page and the billing APIs don't exist", async ({ request }) => {
    for (const locale of locales) expect((await request.get(`/${locale}/pricing`)).status()).toBe(404);
    expect((await request.post("/api/billing/subscribe", { data: { period: "monthly", locale: "es" } })).status()).toBe(404);
    expect((await request.post("/api/billing/cancel")).status()).toBe(404);
    expect((await request.get("/api/billing/mock-checkout?id=mock-1&back=/es", { maxRedirects: 0 })).status()).toBe(404);
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/pricing");
  });
});

test.describe("Pro off with a paid subscription in the database", () => {
  test.describe.configure({ timeout: 120_000 });
  const port = Number(process.env.E2E_PORT ?? 3100) + 30;
  const base = `http://localhost:${port}`;
  const email = "paid@pro-off.test";
  let mongo: MongoMemoryServer;
  let app: ChildProcess;

  test.beforeAll(async () => {
    test.setTimeout(180_000);
    mongo = await MongoMemoryServer.create();
    const uri = `${mongo.getUri()}fileflect-pro-off`;
    // A user who paid while Pro was on, signed in with a database session.
    const db = new MongoClient(uri);
    const userId = new ObjectId();
    await db.db().collection("users").insertOne({ _id: userId, email, emailVerified: new Date() });
    await db.db().collection("sessions").insertOne({ sessionToken: "pro-off-session", userId, expires: new Date(Date.now() + 86_400_000) });
    await db.db().collection("subscriptions").insertOne({
      userId, provider: "mock", externalId: "mock-paid", region: "AR", period: "monthly", amount: 1, currency: "ARS",
      status: "active", currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000), createdAt: new Date(),
    });
    await db.close();
    app = await startApp(port, { AUTH_SECRET: "e2e-only-not-a-real-secret", MONGODB_URI: uri, AUTH_EMAIL_LOG_LINKS: "true" });
  });

  test.afterAll(async () => {
    app?.kill();
    await mongo?.stop();
  });

  test("My account has no subscription section and the user is on the free plan", async ({ page, request }) => {
    const cookie = "authjs.session-token=pro-off-session";
    const session = await (await request.get(`${base}/api/auth/session`, { headers: { cookie } })).json();
    expect(session.user).toMatchObject({ email, plan: "free" });
    await page.context().addCookies([{ name: "authjs.session-token", value: "pro-off-session", url: base }]);
    await page.goto(`${base}/es/account`);
    await expect(page.getByRole("heading", { name: "Mi cuenta" })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tu plan" })).toHaveCount(0);
    await expect(page.locator('a[href$="/pricing"]')).toHaveCount(0);
    expect(await page.locator("body").innerText()).not.toMatch(pro);
  });
});
