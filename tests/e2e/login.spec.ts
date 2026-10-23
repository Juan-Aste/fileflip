// Login form states: sending, errors and success, with the Auth.js endpoints
// stubbed (no real email is sent). The web server enables both methods.
import type { Page, Route } from "@playwright/test";
import { expect, test } from "./support";

const csrf = (route: Route) => route.fulfill({ json: { csrfToken: "e2e-token" } });

/** Counts sign-in POSTs and answers each one with `respond`. */
async function stubSignIn(page: Page, respond: (route: Route) => Promise<void>) {
  const posts: string[] = [];
  await page.route("**/api/auth/csrf", csrf);
  await page.route("**/api/auth/signin/nodemailer", (route) => {
    posts.push(route.request().postData() ?? "");
    return respond(route);
  });
  return posts;
}

const button = (page: Page) => page.getByRole("button", { name: /Enviarme un enlace|Enviando/ });

test.describe("email login", () => {
  test("shows sending, blocks double submits and goes to the verify page", async ({ page }) => {
    let release!: () => void;
    const released = new Promise<void>((r) => (release = r));
    const posts = await stubSignIn(page, async (route) => {
      await released;
      await route.fulfill({ json: { url: `${new URL(page.url()).origin}/api/auth/verify-request?provider=nodemailer&type=email` } });
    });
    await page.goto("/es/login");
    await page.getByLabel("Tu correo electrónico").fill("ana@example.com");
    await button(page).click();

    await expect(button(page)).toBeDisabled();
    await expect(button(page)).toHaveText("Enviando…");
    await expect(button(page)).toHaveAttribute("aria-busy", "true");
    // Enter and a forced click must not send a second request.
    await page.getByLabel("Tu correo electrónico").press("Enter");
    await button(page).click({ force: true });
    await expect.poll(() => posts.length).toBe(1);
    expect(new URLSearchParams(posts[0]).get("email")).toBe("ana@example.com");
    expect(new URLSearchParams(posts[0]).get("csrfToken")).toBe("e2e-token");
    expect(new URLSearchParams(posts[0]).get("callbackUrl")).toBe("/es/account");

    release();
    await page.waitForURL("**/es/login/verify");
    await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
    expect(posts).toHaveLength(1);
  });

  test("reports a server error and lets the user retry", async ({ page }) => {
    const posts = await stubSignIn(page, (route) =>
      route.fulfill({ json: { url: `${new URL(page.url()).origin}/login?error=Configuration` } }),
    );
    await page.goto("/es/login");
    await page.getByLabel("Tu correo electrónico").fill("ana@example.com");
    await button(page).click();

    const alert = page.locator("#email-error");
    await expect(alert).toHaveText("No pudimos enviarte el enlace. Inténtalo de nuevo en unos minutos.");
    await expect(alert).toHaveAttribute("role", "alert");
    await expect(alert).toBeFocused();
    await expect(button(page)).toBeEnabled();
    await expect(button(page)).toHaveText("Enviarme un enlace");
    await expect(page).toHaveURL(/\/es\/login$/);

    await button(page).click();
    await expect.poll(() => posts.length).toBe(2);
    await expect(alert).toBeVisible();
  });

  test("reports HTTP 500 and network errors", async ({ page }) => {
    let fail: "500" | "network" = "500";
    await stubSignIn(page, (route) => (fail === "500" ? route.fulfill({ status: 500, body: "" }) : route.abort("failed")));
    await page.goto("/es/login");
    await page.getByLabel("Tu correo electrónico").fill("ana@example.com");
    await button(page).click();
    await expect(page.locator("#email-error")).toHaveText(/No pudimos enviarte el enlace/);

    fail = "network";
    await button(page).click();
    await expect(page.locator("#email-error")).toHaveText(/No hay conexión con el servidor/);
    await expect(button(page)).toBeEnabled();
  });

  test("gives up after 20 seconds", async ({ page }) => {
    await page.clock.install();
    const posts = await stubSignIn(page, () => new Promise(() => {}));
    await page.goto("/es/login");
    await page.getByLabel("Tu correo electrónico").fill("ana@example.com");
    await button(page).click();
    await expect.poll(() => posts.length).toBe(1);
    await expect(button(page)).toBeDisabled();

    await page.clock.runFor(19_000);
    await expect(button(page)).toBeDisabled();
    await page.clock.runFor(2_000);
    await expect(page.locator("#email-error")).toHaveText(/El envío está tardando demasiado/);
    await expect(page.locator("#email-error")).toBeFocused();
    await expect(button(page)).toBeEnabled();
  });

  test("validates the email before sending", async ({ page }) => {
    const posts = await stubSignIn(page, (route) => route.abort());
    await page.goto("/es/login");
    const input = page.getByLabel("Tu correo electrónico");
    await input.fill("ana@");
    await button(page).click();
    await expect(page.locator("#email-error")).toHaveText(/Escribe un correo electrónico válido/);
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toBeFocused();
    expect(posts).toHaveLength(0);
    await input.fill("ana@example.com");
    await expect(input).not.toHaveAttribute("aria-invalid");
  });

  test("is translated", async ({ page }) => {
    await stubSignIn(page, (route) => route.fulfill({ status: 500, body: "" }));
    await page.goto("/en/login");
    await page.getByLabel("Your email").fill("ana@example.com");
    await page.getByRole("button", { name: "Email me a link" }).click();
    await expect(page.locator("#email-error")).toHaveText("We couldn't send you the link. Please try again in a few minutes.");
  });
});

test.describe("google login", () => {
  test("shows a pending state while redirecting", async ({ page }) => {
    let posts = 0;
    // The server action posts to the page itself; hold it so the pending state is visible.
    await page.route("**/es/login", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      posts++;
      return new Promise(() => {});
    });
    await page.goto("/es/login");
    const google = page.getByRole("button", { name: /Continuar con Google|Redirigiendo/ });
    await google.click();
    await expect(google).toHaveText("Redirigiendo…");
    await expect(google).toBeDisabled();
    await expect(google).toHaveAttribute("aria-busy", "true");
    await google.click({ force: true });
    expect(posts).toBe(1);
  });
});
