// How tools behave when things go wrong (6C.1 in PLAN.md): slow, failing,
// hanging or unreachable conversion API, no connection after the page loaded,
// double clicks and cancelling. Every case must show that it is working, send
// one request, end in a clear translated message (role="alert") and leave the
// tool usable, so the user can try again.
import { readFileSync } from "node:fs";
import type { Page, Route } from "@playwright/test";
import { expect, fixturePath, openWithFiles, test } from "./support";

const pdf = readFileSync(fixturePath("document.pdf"));
const es = {
  serviceUnavailable: "El servicio no está disponible. Inténtalo más tarde.",
  rateLimited: "Hiciste muchas conversiones seguidas. Espera un minuto.",
  fileTooLarge: /demasiado grande|supera/,
  conversionFailed: "No se pudo convertir este archivo.",
  jobCancelled: "Se canceló el proceso.",
  connectionLost: "Se perdió la conexión",
};

// Server tools: the API route is replaced by `handler`; requests are counted.
const serverTools = [
  { tool: "markdown-to-pdf", path: "/es/markdown-a-pdf", files: ["document.md"], endpoint: "**/api/convert/markdown", action: "Convertir a PDF" },
  { tool: "pdf-to-pdfa", path: "/es/pdf-a-pdfa", files: ["document-1page.pdf"], endpoint: "**/api/convert/pdfa", action: "Convertir a PDF/A" },
  { tool: "epub-to-pdf", path: "/es/epub-a-pdf", files: ["book.epub"], endpoint: "**/api/convert/**", action: "Convertir a PDF" },
] as const;

type Handler = (route: Route) => Promise<void> | void;

async function serve(page: Page, endpoint: string, handler: Handler) {
  const calls: string[] = [];
  await page.route(endpoint, async (route) => {
    calls.push(route.request().url());
    await handler(route);
  });
  return calls;
}

const json = (status: number, error: string) => (route: Route) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error }) });
const html = (status: number) => (route: Route) => route.fulfill({ status, contentType: "text/html", body: "<html><body>Bad gateway</body></html>" });
const ok = (route: Route) => route.fulfill({ status: 200, contentType: "application/pdf", body: pdf });

/** The tool's own messages (Next.js adds an empty route announcer outside <main>). */
const alert = (page: Page) => page.locator("main [role=alert]").filter({ hasText: /\w/ });

for (const t of serverTools) {
  test.describe(`server tool ${t.tool}`, () => {
    const action = (page: Page) => page.getByRole("button", { name: t.action, exact: true });

    // Ends in `message`, then a second try (same file, no re-pick) succeeds.
    async function failsThenRetries(page: Page, handler: Handler, message: string | RegExp) {
      let failing = true;
      const calls = await serve(page, t.endpoint, (route) => (failing ? handler(route) : ok(route)));
      await openWithFiles(page, t.path, [...t.files]);
      await action(page).click();
      await expect(alert(page).first()).toContainText(message, { timeout: 20_000 });
      failing = false;
      const retry = page.getByRole("button", { name: /^(Reintentar|Convertir a PDF|Convertir a PDF\/A)$/ }).first();
      await expect(retry).toBeEnabled();
      await retry.click();
      await expect(page.locator("main a[download]").first()).toBeVisible({ timeout: 20_000 });
      expect(calls.length).toBe(2);
    }

    test("503 with an error code → translated message, then retry", async ({ page }) => {
      await failsThenRetries(page, json(503, "serviceUnavailable"), es.serviceUnavailable);
    });
    test("429 → rate limit message", async ({ page }) => {
      await failsThenRetries(page, json(429, "rateLimited"), es.rateLimited);
    });
    test("502 page from the proxy (no JSON) → service unavailable", async ({ page }) => {
      await failsThenRetries(page, html(502), es.serviceUnavailable);
    });
    test("413 page from the proxy (no JSON) → file too large", async ({ page }) => {
      await failsThenRetries(page, html(413), es.fileTooLarge);
    });
    test("no connection after the page loaded → says so, then works once back online", async ({ page, context }) => {
      // Offline, the upload is aborted by the test fixture's route; back online it goes through.
      await openWithFiles(page, t.path, [...t.files]);
      await context.setOffline(true);
      await action(page).click();
      await expect(alert(page).first()).toContainText(es.connectionLost, { timeout: 20_000 });
      await context.setOffline(false);
      await serve(page, t.endpoint, ok);
      await action(page).click();
      await expect(page.locator("main a[download]").first()).toBeVisible({ timeout: 20_000 });
    });
    test("slow answer: working state, double click sends one request", async ({ page }) => {
      const calls = await serve(page, t.endpoint, async (route) => {
        await new Promise((r) => setTimeout(r, 2_000));
        await ok(route);
      });
      await openWithFiles(page, t.path, [...t.files]);
      await action(page).dblclick();
      await expect(page.getByRole("button", { name: "Procesando…" }).or(page.getByRole("progressbar")).first()).toBeVisible();
      await expect(page.locator("main a[download]").first()).toBeVisible({ timeout: 20_000 });
      expect(calls.length).toBe(1);
    });
    test("a request that never answers can be cancelled", async ({ page }) => {
      const pending: Route[] = [];
      await serve(page, t.endpoint, (route) => void pending.push(route));
      await openWithFiles(page, t.path, [...t.files]);
      await action(page).click();
      await expect.poll(() => pending.length).toBe(1);
      const cancel = page.getByRole("button", { name: "Cancelar", exact: true });
      await expect(cancel).toBeVisible();
      await cancel.click();
      await expect(alert(page).first()).toContainText(es.jobCancelled);
      await expect(action(page)).toBeEnabled();
    });
  });
}

// Browser tools load their engine (code, WASM, OCR data) when they run: with
// the connection gone by then they must say so, not hang or blame the file.
const browserTools = [
  { tool: "compress-image", path: "/es/comprimir-imagen", files: ["photo.jpg"], action: "Comprimir imágenes" },
  { tool: "merge-pdf", path: "/es/unir-pdf", files: ["document.pdf", "document-1page.pdf"], action: "Unir PDF" },
  { tool: "audio-converter", path: "/es/convertir-audio", files: ["audio.mp3"], action: "Convertir audio" },
  { tool: "image-to-text", path: "/es/imagen-a-texto", files: ["ocr-en.jpg"], action: "Extraer texto" },
  { tool: "extract-archive", path: "/es/extraer-zip", files: ["archive.zip"], action: "Extraer archivos" },
] as const;

for (const t of browserTools) {
  test.describe(`browser tool ${t.tool}`, () => {
    test("offline after the page loaded → a result or a clear message, and it works again online", async ({ page, context }) => {
      await openWithFiles(page, t.path, [...t.files]);
      await context.setOffline(true);
      const action = page.getByRole("button", { name: t.action, exact: true });
      await action.click();
      const done = page.locator("main a[download]").or(page.getByRole("button", { name: /^Descargar todo/ }));
      await expect(done.or(alert(page)).first()).toBeVisible({ timeout: 30_000 });
      test.info().annotations.push({ type: "outcome", description: (await alert(page).count()) ? await alert(page).first().innerText() : "result" });
      if (await alert(page).count()) {
        await expect(alert(page).first()).toContainText(es.connectionLost);
        await context.setOffline(false);
        await action.click();
        await expect(done.first()).toBeVisible({ timeout: 45_000 });
      }
    });

    test("double click runs once", async ({ page }) => {
      await openWithFiles(page, t.path, [...t.files]);
      await page.getByRole("button", { name: t.action, exact: true }).dblclick();
      const done = page.locator("main a[download]").or(page.getByRole("button", { name: /^Descargar todo/ }));
      await expect(done.first()).toBeVisible({ timeout: 45_000 });
      await expect(alert(page)).toHaveCount(0);
    });
  });
}

test("a slow browser job (OCR) can be cancelled and run again", async ({ page }) => {
  await openWithFiles(page, "/es/imagen-a-texto", ["ocr-en.jpg"]);
  const action = page.getByRole("button", { name: "Extraer texto", exact: true });
  await action.click();
  const cancel = page.getByRole("button", { name: "Cancelar", exact: true });
  await expect(cancel).toBeVisible();
  await cancel.click();
  await expect(alert(page).first()).toContainText(es.jobCancelled);
  await expect(action).toBeEnabled();
  await action.click();
  await expect(page.locator("main a[download]").or(page.getByRole("button", { name: /^Copiar/ })).first()).toBeVisible({ timeout: 45_000 });
});
