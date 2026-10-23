// Checkout ("Pasar a Pro") when its API is slow, fails, hangs or the
// connection is gone, and with double clicks (6C.2 in PLAN.md). Runs signed
// in on the second test server, where PAYMENTS_MOCK shows the button; the API
// is stubbed, so no subscription is created.
import type { Page, Route } from "@playwright/test";
import { signInAsAdmin } from "./hit-test";
import { expect, test } from "./support";

const base = `http://localhost:${Number(process.env.E2E_PORT ?? 3100) + 1}`;
const es = {
  serviceUnavailable: "El servicio no está disponible. Inténtalo más tarde.",
  paymentsUnavailable: /pagos|pago/,
  connectionLost: "Se perdió la conexión",
};

async function openPricing(page: Page, handler: (route: Route) => Promise<void> | void) {
  const calls: string[] = [];
  await page.route("**/api/billing/subscribe", async (route) => {
    calls.push(route.request().method());
    await handler(route);
  });
  await signInAsAdmin(page, base);
  await page.goto(`${base}/es/pricing`, { waitUntil: "networkidle" });
  const button = page.getByRole("button", { name: "Pasar a Pro" }).first();
  await expect(button).toBeEnabled();
  return { calls, button };
}

const alert = (page: Page) => page.locator("main [role=alert]").filter({ hasText: /\w/ });

test.describe("checkout button", () => {
  test("slow answer: shows it is working and sends one request on double click", async ({ page }) => {
    const { calls, button } = await openPricing(page, async (route) => {
      await new Promise((r) => setTimeout(r, 1_500));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: `${base}/es/account` }) });
    });
    await button.dblclick();
    await expect(page.locator("main [aria-busy=true]").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Redirigiendo|Procesando/ }).first()).toBeVisible();
    await page.waitForURL(/\/es\/account/);
    expect(calls.length).toBe(1);
  });

  for (const [name, handler, message] of [
    ["503 with a code", (r: Route) => r.fulfill({ status: 503, contentType: "application/json", body: '{"error":"paymentsUnavailable"}' }), es.paymentsUnavailable],
    ["502 page from the proxy", (r: Route) => r.fulfill({ status: 502, contentType: "text/html", body: "<h1>Bad gateway</h1>" }), es.serviceUnavailable],
    ["network error", (r: Route) => r.abort("failed"), es.serviceUnavailable],
  ] as const) {
    test(`${name} → translated message, then it can be tried again`, async ({ page }) => {
      const { calls, button } = await openPricing(page, handler);
      await button.click();
      await expect(alert(page).first()).toContainText(message);
      await expect(button).toBeEnabled();
      await button.click();
      await expect.poll(() => calls.length).toBe(2);
    });
  }

  test("offline → says the connection dropped", async ({ page, context }) => {
    const { button } = await openPricing(page, (r) => r.abort("internetdisconnected"));
    await context.setOffline(true);
    await button.click();
    await expect(alert(page).first()).toContainText(es.connectionLost);
    await expect(button).toBeEnabled();
  });

  test("an answer that never comes gives up with a message instead of a dead button", async ({ page }) => {
    await page.clock.install();
    const { button } = await openPricing(page, () => undefined);
    await button.click();
    await expect(page.getByRole("button", { name: "Redirigiendo…" })).toBeDisabled();
    await page.clock.runFor(25_000);
    await expect(alert(page).first()).toContainText(es.serviceUnavailable);
    await expect(button).toBeEnabled();
  });
});
