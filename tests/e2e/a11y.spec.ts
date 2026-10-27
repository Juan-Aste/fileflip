// Accessibility: axe-core (WCAG 2 A/AA) on every published tool page and the
// catalog pages, a sample in dark mode and in the other languages, and a
// keyboard sweep (skip link, visible focus on every stop, nothing hidden
// focusable) on tools with custom controls.
import type { Page } from "@playwright/test";
import { availableTools, tools, type ToolId } from "../../src/config/tools";
import { allToolsSlugs, categorySlug, publishedCategories } from "../../src/config/categories";
import { creditsSlugs } from "../../src/config/credits";
import { axeViolations } from "./axe";
import { expect, fixturePath, test } from "./support";

async function expectNoViolations(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  expect(await axeViolations(page), path).toEqual([]);
}

const toolPath = (id: ToolId, locale: "es" | "en" | "pt" | "fr" | "zh" = "es") => `/${locale}/${tools[id].slugs[locale]}`;

test.describe("axe, light", () => {
  test.use({ colorScheme: "light" });

  test("home, all tools and categories", async ({ page }) => {
    test.setTimeout(120_000);
    for (const path of ["/es", `/es/${allToolsSlugs.es}`, ...publishedCategories.map((c) => `/es/${categorySlug(c, "es")}`)]) {
      await expectNoViolations(page, path);
    }
  });

  test("credits and licenses page, light, dark and Chinese", async ({ page }) => {
    await expectNoViolations(page, `/es/${creditsSlugs.es}`);
    await page.emulateMedia({ colorScheme: "dark" });
    await expectNoViolations(page, `/es/${creditsSlugs.es}`);
    await expectNoViolations(page, `/zh/${creditsSlugs.zh}`);
    // The download, the LGPL license texts and the footer link work.
    expect((await page.request.get("/third-party-notices.txt")).ok()).toBe(true);
    expect((await page.request.get("/licenses/LGPL-2.0.txt")).ok()).toBe(true);
    await page.goto("/es");
    await page.locator("footer").getByRole("link", { name: "Créditos" }).click();
    await expect(page).toHaveURL(/\/es\/creditos$/);
  });

  // Split in chunks so the workers share the ~80 pages.
  const chunk = 12;
  for (let i = 0; i < availableTools.length; i += chunk) {
    const ids = availableTools.slice(i, i + chunk);
    test(`tool pages ${i + 1}–${i + ids.length}`, async ({ page }) => {
      test.setTimeout(150_000);
      for (const id of ids) await expectNoViolations(page, toolPath(id));
    });
  }
});

const sample: ToolId[] = [
  "merge-pdf",
  "sign-pdf",
  "json-to-csv",
  "qr-generator",
  "color-converter",
  "crop-image",
  "id-photo",
  "remove-background",
  "subtitle-converter",
  "extract-archive",
  "trim-video",
  "model-converter",
  "dxf-converter",
].filter((id): id is ToolId => (availableTools as readonly string[]).includes(id));

test.describe("axe, dark and other languages", () => {
  test.use({ colorScheme: "dark" });

  test("sample of tools in dark mode", async ({ page }) => {
    test.setTimeout(150_000);
    expect(sample.length).toBeGreaterThanOrEqual(10);
    for (const path of ["/es", ...sample.map((id) => toolPath(id))]) await expectNoViolations(page, path);
  });

  test("other languages", async ({ page }) => {
    test.setTimeout(120_000);
    for (const locale of ["en", "pt", "fr", "zh"] as const) {
      await expectNoViolations(page, `/${locale}`);
      await expectNoViolations(page, toolPath("crop-image", locale));
      await expectNoViolations(page, toolPath("trim-audio", locale));
    }
  });
});

// Login page with both methods, idle and with a send error.
for (const colorScheme of ["light", "dark"] as const) {
  test(`axe on the login page and its error message (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.route("**/api/auth/csrf", (route) => route.fulfill({ json: { csrfToken: "e2e" } }));
    await page.route("**/api/auth/signin/nodemailer", (route) => route.fulfill({ status: 500, body: "" }));
    await expectNoViolations(page, "/es/login");
    await page.getByLabel("Tu correo electrónico").fill("ana@example.com");
    await page.getByRole("button", { name: "Enviarme un enlace" }).click();
    await expect(page.locator("#email-error")).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
}

// After a run: results, download links, previews and error messages.
for (const colorScheme of ["light", "dark"] as const) {
  test(`axe on finished jobs with a result and an error (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto(toolPath("compress-image"), { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').first().setInputFiles([fixturePath("photo.jpg"), fixturePath("corrupt/truncated.jpg")]);
    await page.getByRole("button", { name: "Comprimir imágenes", exact: true }).click();
    const items = page.locator("main ul").filter({ has: page.locator("a[download]") }).locator("li");
    await expect(items).toHaveCount(2, { timeout: 60_000 });
    expect(await axeViolations(page)).toEqual([]);

    await page.goto(toolPath("json-to-csv"), { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').first().setInputFiles(fixturePath("data.json"));
    await page.getByRole("button", { name: "Convertir a CSV", exact: true }).click();
    await page.locator("main a[download]").first().waitFor();
    expect(await axeViolations(page)).toEqual([]);
  });
}

/** Tabs through the page, returning a description of every focus stop. */
async function tabStops(page: Page, max = 80) {
  const stops: { label: string; visible: boolean; indicator: boolean }[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const label = `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40)}"`;
      const visible = r.width > 0 && r.height > 0 && s.visibility !== "hidden" && Number(s.opacity) > 0;
      // A focus ring: outline, box-shadow ring, or a native control (inputs draw their own).
      const indicator =
        (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) ||
        s.boxShadow !== "none" ||
        // Visually hidden file/radio inputs show focus on their label (peer-focus-visible).
        ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName);
      return { label, visible, indicator };
    });
    if (!stop) break;
    stops.push(stop);
  }
  return stops;
}

test.describe("keyboard", () => {
  test("skip link moves focus to the main content", async ({ page }) => {
    await page.goto(toolPath("crop-image"), { waitUntil: "networkidle" });
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Saltar al contenido" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
    await page.keyboard.press("Tab");
    const inMain = await page.evaluate(() => !!document.activeElement?.closest("main"));
    expect(inMain).toBe(true);
  });

  for (const id of ["crop-image", "color-converter", "password-generator", "sign-pdf", "trim-video", "id-photo"] as ToolId[]) {
    test(`every focus stop is visible and shows focus: ${id}`, async ({ page }) => {
      test.skip(!(availableTools as readonly string[]).includes(id), "not published");
      await page.goto(toolPath(id), { waitUntil: "networkidle" });
      const stops = await tabStops(page);
      expect(stops.length).toBeGreaterThan(5);
      const hidden = stops.filter((s) => !s.visible).map((s) => s.label);
      const noRing = stops.filter((s) => s.visible && !s.indicator).map((s) => s.label);
      expect(hidden, "focusable but invisible").toEqual([]);
      expect(noRing, "no visible focus indicator").toEqual([]);
    });
  }
});
