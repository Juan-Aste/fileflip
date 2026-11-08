// Published legal texts (7.3 in PLAN.md): Terms and conditions and Privacy
// policy in the 5 languages with the person responsible and the contact
// address, no internal draft notes anywhere, the free-service version while
// Pro is off (main server), the contact page, and the express acceptance
// next to the sign-in buttons (billing-states.spec.ts checks the one next to
// the subscribe button). legal-sections.test.ts checks that the Pro sections
// appear with the switch on.
import { axeViolations } from "./axe";
import { expect, test } from "./support";

const draftNotes = /\[(revisar|decidir|definir|consultar)|\bBORRADOR\b|\bDRAFT\b/;
// Elsewhere "BORRADOR" is a legitimate example (the PDF watermark tool).
const internalNotes = /\[(revisar|decidir|definir|consultar)/i;
const titles: Record<string, { terms: string; privacy: string; free: string; hours: string }> = {
  es: { terms: "Términos y condiciones", privacy: "Política de privacidad", free: "Servicio gratuito", hours: "lunes a viernes" },
  en: { terms: "Terms and conditions", privacy: "Privacy policy", free: "Free service", hours: "Monday to Friday" },
  pt: { terms: "Termos e condições", privacy: "Política de privacidade", free: "Serviço gratuito", hours: "segunda a sexta-feira" },
  fr: { terms: "Conditions générales", privacy: "Politique de confidentialité", free: "Service gratuit", hours: "lundi au vendredi" },
  zh: { terms: "条款和条件", privacy: "隐私政策", free: "免费服务", hours: "周一至周五" },
};

for (const [locale, t] of Object.entries(titles)) {
  test(`legal pages and contact (${locale})`, async ({ page }) => {
    for (const [path, title] of [["/terms", t.terms], ["/privacy", t.privacy]]) {
      await page.goto(`/${locale}${path}`);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      const body = await page.locator("main").innerText();
      expect(body).toContain("Juan Pablo Aste");
      expect(body).toContain("contact@fileflect.com");
      expect(body).not.toMatch(draftNotes);
      // Pro is off: no paid plan, no payment processor.
      expect(body).not.toMatch(/\bPro\b|Mercado Pago/);
      if (path === "/terms") await expect(page.getByRole("heading", { level: 2, name: t.free })).toBeVisible();
      if (path === "/privacy") expect(body).toContain("Ley Nº 25.326");
    }
    await page.goto(`/${locale}/contact`);
    await expect(page.locator('main a[href="mailto:contact@fileflect.com"]')).toBeVisible();
    await expect(page.locator("main")).toContainText("contact@fileflect.com");
    await expect(page.locator("main")).toContainText(t.hours);
  });
}

test("no draft notes on the main pages", async ({ page }) => {
  for (const path of ["/es", "/en", "/es/unir-pdf", "/es/login", "/es/contact", "/es/herramientas"]) {
    await page.goto(path);
    expect(await page.locator("body").innerText(), path).not.toMatch(internalNotes);
  }
});

test("express acceptance next to the sign-in buttons, with links", async ({ page }) => {
  await page.goto("/es/login");
  const consent = page.getByText(/Al continuar, aceptas los Términos y condiciones y la Política de privacidad, incluida la transferencia de datos a proveedores fuera de Argentina/);
  await expect(consent).toBeVisible();
  await expect(consent.getByRole("link", { name: "Términos y condiciones" })).toHaveAttribute("href", "/es/terms");
  await expect(consent.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute("href", "/es/privacy");
});

// AGPL-3.0 §13 (task 11.5c): with NEXT_PUBLIC_SOURCE_URL set at build time the
// footer and the credits page link to the source code; without it, nothing.
test("source code link only with NEXT_PUBLIC_SOURCE_URL", async ({ page }) => {
  const source = process.env.NEXT_PUBLIC_SOURCE_URL?.trim();
  await page.goto("/es/creditos");
  const footerLink = page.locator("footer").getByRole("link", { name: "Código fuente", exact: true });
  const section = page.getByRole("heading", { level: 2, name: "Código fuente" });
  if (!source) {
    await expect(footerLink).toHaveCount(0);
    await expect(section).toHaveCount(0);
    return;
  }
  await expect(footerLink).toHaveAttribute("href", new URL(source).href);
  await expect(section).toBeVisible();
  await expect(page.getByRole("link", { name: /Ver el código fuente de Fileflect/ })).toHaveAttribute("href", new URL(source).href);
  await expect(page.locator("main")).toContainText("AGPL-3.0");
  await page.goto("/en");
  await expect(page.locator("footer").getByRole("link", { name: "Source code", exact: true })).toHaveAttribute("href", new URL(source).href);
});

// About page (19.3): 5 languages, footer link, facts, links, schema and axe.
const aboutTitles: Record<string, { title: string; footer: string }> = {
  es: { title: "Quiénes somos", footer: "Quiénes somos" },
  en: { title: "About Fileflect", footer: "About" },
  pt: { title: "Quem somos", footer: "Quem somos" },
  fr: { title: "Qui sommes-nous", footer: "Qui sommes-nous" },
  zh: { title: "关于我们", footer: "关于我们" },
};
for (const [locale, t] of Object.entries(aboutTitles)) {
  test(`about page (${locale}) @xb`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await page.locator("footer").getByRole("link", { name: t.footer, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/about$`));
    await expect(page.getByRole("heading", { level: 1, name: t.title })).toBeVisible();
    const main = page.locator("main");
    await expect(main).toContainText("Juan Pablo Aste");
    await expect(main).toContainText("Vicente López");
    await expect(main).toContainText("AdSense");
    await expect(main).not.toContainText("{email}");
    await expect(main.locator('a[href="mailto:contact@fileflect.com"]')).toBeVisible();
    await expect(main.locator(`a[href="/${locale}/privacy"]`)).toBeVisible();
    await expect(main.locator(`a[href="/${locale}/contact"]`)).toBeVisible();
    const source = process.env.NEXT_PUBLIC_SOURCE_URL?.trim();
    await expect(main.locator(`a[href="${source ? new URL(source).href : "__none__"}"]`)).toHaveCount(source ? 1 : 0);
    expect(await main.innerText()).not.toMatch(draftNotes);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((s) => JSON.parse(s));
    const about = ld.find((d) => d["@type"] === "AboutPage");
    expect(about?.mainEntity?.["@type"]).toBe("Organization");
    expect(about?.mainEntity?.founder?.name).toBe("Juan Pablo Aste");
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(new RegExp(`/${locale}/about$`));
  });
}

test("about page: axe light, dark and Chinese; unprefixed URL redirects", async ({ page }) => {
  for (const [path, scheme] of [["/es/about", "light"], ["/es/about", "dark"], ["/zh/about", "light"]] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(path, { waitUntil: "networkidle" });
    expect(await axeViolations(page), `${path} ${scheme}`).toEqual([]);
  }
  const res = await page.request.get("/about", { maxRedirects: 0 });
  expect(res.status()).toBe(301);
  expect(res.headers().location).toMatch(/\/es\/about$/);
});
