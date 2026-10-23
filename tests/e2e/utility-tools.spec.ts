// Color and unit converters update live; the values on the page are checked
// against reference numbers (CSS Color 4, WCAG 2, exact unit definitions).
import { expect, test } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "utility tools must not call the server").toEqual([]);
});

test.describe("tool: color-converter", () => {
  test("converts between notations and checks WCAG contrast", { tag: "@xb" }, async ({ page }) => {
    await page.goto("/es/conversor-de-colores", { waitUntil: "networkidle" });
    const input = page.getByRole("textbox", { name: /^Color \(HEX/ });
    await input.fill("rgb(255 0 0)");
    await expect(page.locator('[data-format="hex"]')).toHaveText("#ff0000");
    await expect(page.locator('[data-format="hsl"]')).toHaveText("hsl(0 100% 50%)");
    await expect(page.locator('[data-format="oklch"]')).toHaveText(/^oklch\(62\.8\d?% 0\.257\d* 29\.2\d?\)$/);
    await input.fill("#767676");
    await expect(page.getByTestId("contrast-ratio")).toHaveText("Contraste: 4,54:1");
    const rows = page.locator("table tbody tr");
    await expect(rows.nth(0)).toContainText("Texto normalCumpleNo cumple");
    await page.getByRole("textbox", { name: "Color de fondo", exact: true }).fill("black");
    await expect(page.getByTestId("contrast-ratio")).toHaveText("Contraste: 4,62:1");
    await input.fill("verde");
    await expect(page.getByText("No es un color válido")).toBeVisible();
  });

  test("the color picker updates the text field", async ({ page }) => {
    await page.goto("/en/color-converter", { waitUntil: "networkidle" });
    await page.getByLabel("Pick Color (HEX, RGB, HSL, OKLCH or CSS name)").fill("#336699");
    await expect(page.getByRole("textbox", { name: /^Color \(HEX/ })).toHaveValue("#336699");
    await expect(page.locator('[data-format="rgb"]')).toHaveText("rgb(51 102 153)");
  });
});

test.describe("tool: unit-converter", () => {
  test("length with a decimal comma, swap, and every unit listed", async ({ page }) => {
    await page.goto("/es/conversor-de-unidades", { waitUntil: "networkidle" });
    await page.getByRole("textbox", { name: "Valor" }).fill("2,5");
    await page.getByRole("combobox", { name: "De", exact: true }).selectOption("in");
    await page.getByRole("combobox", { name: "A", exact: true }).selectOption("cm");
    await expect(page.getByTestId("unit-result")).toHaveText("2,5 in = 6,35 cm");
    await page.getByRole("button", { name: "Intercambiar unidades" }).click();
    await expect(page.getByTestId("unit-result")).toHaveText("2,5 cm = 0,9842519685 in");
    await expect(page.locator("table tbody tr")).toHaveCount(9);
    await expect(page.locator("table tbody tr").filter({ hasText: "Millas náuticas" })).toContainText("NM");
  });

  test("temperature and data, and invalid input", async ({ page }) => {
    await page.goto("/en/unit-converter", { waitUntil: "networkidle" });
    await page.locator("label").filter({ hasText: /^Temperature$/ }).click();
    await page.getByRole("textbox", { name: "Value" }).fill("100");
    await expect(page.getByTestId("unit-result")).toHaveText("100 °C = 212 °F");
    await page.locator("label").filter({ hasText: /^Data$/ }).click();
    await page.getByRole("textbox", { name: "Value" }).fill("1");
    await page.getByRole("combobox", { name: "From", exact: true }).selectOption("gib");
    await page.getByRole("combobox", { name: "To", exact: true }).selectOption("mb");
    await expect(page.getByTestId("unit-result")).toHaveText("1 GiB = 1,073.741824 MB");
    await page.getByRole("textbox", { name: "Value" }).fill("abc");
    await expect(page.getByText("Enter a number")).toBeVisible();
  });
});
