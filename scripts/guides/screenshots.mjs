// Real screenshots of our tools for the guides (public/guides/*.webp) and their
// sizes (src/content/guides/images.json), taken against a running `next start`.
// Usage:
//   node scripts/guides/screenshots.mjs [--locale=es,en] [name ...]
// Each shot is taken in the page of that language, with its labels (read from
// messages/*.json) and sample files in that language: "name" in Spanish,
// "name.en", "name.pt"... in the others (src/lib/guides/render.ts picks the
// one of the guide's language). BASE_URL defaults to http://localhost:3000;
// CHROME_PATH to the Playwright Chromium preinstalled in the cloud environment.
// Without names, every shot is taken again. Sample files are generated on the
// fly (nothing personal).
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright-core";
import sharp from "sharp";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const executablePath = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium";
const outDir = "public/guides";
const manifestPath = "src/content/guides/images.json";
const fixtures = "tests/fixtures";
const work = mkdtempSync(join(tmpdir(), "guides-"));
const allLocales = ["es", "en", "pt", "fr", "zh"];
const browserLocale = { es: "es-ES", en: "en-US", pt: "pt-BR", fr: "fr-FR", zh: "zh-CN" };

/** A message of messages/<locale>.json by its dotted path ("Converter.convert"). */
const messages = Object.fromEntries(allLocales.map((l) => [l, JSON.parse(readFileSync(`messages/${l}.json`, "utf8"))]));
const msg = (locale, path) => {
  const value = path.split(".").reduce((o, k) => o?.[k], messages[locale]);
  if (typeof value !== "string") throw new Error(`No message ${path} in ${locale}`);
  return value;
};

/** A tool's slug, read from src/config/tools.ts. */
const toolsSource = readFileSync("src/config/tools.ts", "utf8");
const toolSlug = (id, locale) => {
  const block = toolsSource.slice(toolsSource.indexOf(`  "${id}": {`));
  const slugs = block.match(/slugs: \{([^}]*)\}/)?.[1];
  const slug = slugs?.match(new RegExp(`${locale}: "([^"]+)"`))?.[1];
  if (!slug) throw new Error(`No slug for ${id} in ${locale}`);
  return slug;
};
/** A conversion page's slug (src/config/conversion-pages.ts). */
const connector = { es: "a", en: "to", pt: "para", fr: "en", zh: "to" };
const slugName = { docx: "word", xlsx: "excel", pptx: "powerpoint" };
const convSlug = (from, to, locale) => `${slugName[from] ?? from}-${connector[locale]}-${slugName[to] ?? to}`;

// Sample content for the generated files, in each language.
const samples = {
  es: {
    authTitle: "Autorización de retiro",
    authBody:
      "Por la presente autorizo a la persona indicada abajo a retirar en mi nombre la documentación que se encuentra a mi disposición en la oficina de atención al público, en los días y horarios habituales.",
    authFields: ["Nombre de la persona autorizada", "Documento", "Lugar y fecha"],
    sign: "Firma",
    contract: "Contrato de servicios — página",
    clause:
      "Por medio del presente, las partes acuerdan las condiciones del servicio descritas a continuación. El prestador se compromete a entregar los trabajos en los plazos indicados y el cliente a abonar los importes en las fechas pactadas.",
    read: "Leer un texto en voz alta ayuda a revisar lo que escribiste, a descansar la vista o a escuchar un documento mientras haces otra cosa. Pega aquí cualquier texto, o abre un PDF, un Word o la foto de una página, y pulsa Reproducir.",
    speech: "speech-ai-es.ogg",
  },
  en: {
    authTitle: "Collection authorization",
    authBody:
      "I hereby authorize the person named below to collect on my behalf the documents held for me at the customer service office, on the usual days and opening hours.",
    authFields: ["Name of the authorized person", "ID number", "Place and date"],
    sign: "Signature",
    contract: "Service agreement — page",
    clause:
      "The parties hereby agree to the terms of service described below. The provider undertakes to deliver the work within the stated deadlines and the client to pay the amounts on the agreed dates.",
    read: "Listening to a text helps you proofread what you wrote, rest your eyes or follow a document while you do something else. Paste any text here, or open a PDF, a Word file or a photo of a page, and press Play.",
    speech: "speech-ai-en.ogg",
  },
  pt: {
    authTitle: "Autorização de retirada",
    authBody:
      "Pela presente, autorizo a pessoa indicada abaixo a retirar em meu nome a documentação que está à minha disposição no balcão de atendimento, nos dias e horários habituais.",
    authFields: ["Nome da pessoa autorizada", "Documento", "Local e data"],
    sign: "Assinatura",
    contract: "Contrato de prestação de serviços — página",
    clause:
      "Pelo presente instrumento, as partes acordam as condições do serviço descritas a seguir. O prestador se compromete a entregar os trabalhos nos prazos indicados e o cliente a pagar os valores nas datas combinadas.",
    read: "Ouvir um texto em voz alta ajuda a revisar o que você escreveu, descansar a vista ou acompanhar um documento enquanto faz outra coisa. Cole aqui qualquer texto, ou abra um PDF, um Word ou a foto de uma página, e toque em Reproduzir.",
    speech: "speech-ai-en.ogg",
  },
  fr: {
    authTitle: "Procuration pour retrait",
    authBody:
      "Par la présente, j'autorise la personne désignée ci-dessous à retirer en mon nom les documents qui sont à ma disposition au guichet d'accueil, aux jours et heures d'ouverture habituels.",
    authFields: ["Nom de la personne autorisée", "Pièce d'identité", "Lieu et date"],
    sign: "Signature",
    contract: "Contrat de prestation de services — page",
    clause:
      "Par le présent contrat, les parties conviennent des conditions du service décrites ci-dessous. Le prestataire s'engage à livrer les travaux dans les délais indiqués et le client à régler les montants aux dates convenues.",
    read: "Écouter un texte à voix haute aide à relire ce que vous avez écrit, à reposer vos yeux ou à suivre un document pendant que vous faites autre chose. Collez ici n'importe quel texte, ou ouvrez un PDF, un Word ou la photo d'une page, puis appuyez sur Lire.",
    speech: "speech-ai-en.ogg",
  },
  zh: {
    authTitle: "代领授权书",
    authBody: "本人特此授权下列人员在正常办公时间内，代表本人前往服务窗口领取为本人保管的文件。",
    authFields: ["被授权人姓名", "证件号码", "地点和日期"],
    sign: "签名",
    contract: "服务合同 — 第",
    clause: "双方特此同意以下所述的服务条款。服务提供方承诺在规定期限内交付工作成果，客户承诺在约定日期支付相应款项。",
    read: "朗读文本可以帮助你检查自己写的内容、让眼睛休息，或者在做其他事情时听完一份文档。在这里粘贴任意文本，或者打开 PDF、Word 文件或页面照片，然后点击播放。",
    speech: "speech-ai-en.ogg",
  },
};

/** The tool block (drop zone, options and results), not the whole page. */
const toolBlock = (page) => page.locator("[data-guide-col]").locator(":scope > *").nth(shotIndex);
let shotIndex = 0;

async function mark(page) {
  // Mark the block that holds the drop zone before it changes: the child of
  // the page column (the one with the title) that contains the file input.
  shotIndex = await page.evaluate(() => {
    let el = document.querySelector('input[type="file"]');
    while (el.parentElement && !el.parentElement.querySelector(":scope > header, :scope > div > header")) el = el.parentElement;
    el.parentElement.setAttribute("data-guide-col", "");
    return [...el.parentElement.children].indexOf(el);
  });
}

async function pick(page, locale, files) {
  await mark(page);
  await page.locator('input[type="file"]').first().setInputFiles(files);
  const detecting = msg(locale, "Converter.detecting").replace("…", "");
  await page.waitForFunction((text) => !document.body.innerText.includes(text), detecting, { timeout: 15_000 });
}

const open = (page, locale, slug) => page.goto(`${base}/${locale}/${slug}`, { waitUntil: "networkidle" });
const label = (page, text) => page.locator("label").filter({ hasText: text }).first();

/** A one-page authorization (A4) with a line to sign at the bottom right, from HTML so any script works. */
async function authorizationPdf(browser, locale) {
  const s = samples[locale];
  const page = await browser.newPage();
  const fields = s.authFields.map((f) => `<p>${f}: ________________________</p>`).join("");
  await page.setContent(
    `<body style="margin:0;font:15px/1.7 sans-serif;color:#222"><div style="position:relative;width:794px;height:1122px;padding:90px 96px;box-sizing:border-box"><h1 style="font-size:26px">${s.authTitle}</h1><p>${s.authBody}</p><div style="margin-top:28px">${fields}</div><div style="position:absolute;left:455px;top:880px;width:240px;border-top:1px solid #222;text-align:center;font-size:13px;padding-top:6px">${s.sign}</div></div></body>`,
  );
  const file = join(work, `authorization-${locale}.pdf`);
  writeFileSync(file, await page.pdf({ width: "794px", height: "1122px", printBackground: true }));
  await page.close();
  return file;
}

/** Gaussian-like sensor noise around mid gray, the same on every run. */
function seededNoise(width, height) {
  const data = Buffer.alloc(width * height * 3);
  let seed = 20261028;
  const random = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32;
  for (let i = 0; i < data.length; i++) data[i] = Math.max(0, Math.min(255, Math.round(128 + (random() + random() + random() - 1.5) * 36)));
  return data;
}

/** A 4-page PDF of phone photos of a contract (uneven light, noise), like a real one. */
async function photoContractPdf(browser, locale) {
  const s = samples[locale];
  const page = await browser.newPage({ viewport: { width: 756, height: 1008 }, deviceScaleFactor: 4 });
  const doc = await PDFDocument.create();
  for (let n = 1; n <= 4; n++) {
    const paragraphs = Array.from({ length: 7 }, (_, i) => `<p>${i + 1}. ${s.clause}</p>`).join("");
    const heading = locale === "zh" ? `${s.contract} ${n} 页` : `${s.contract} ${n}`;
    await page.setContent(
      `<body style="margin:60px;font:15px/1.6 serif;background:#f4f1ea;color:#222"><h2>${heading}</h2>${paragraphs}<p style="margin-top:40px">${s.sign}: ____________________</p></body>`,
    );
    const png = await page.screenshot();
    const { width, height } = await sharp(png).metadata();
    const noise = await sharp(seededNoise(width, height), { raw: { width, height, channels: 3 } }).png().toBuffer();
    const shade = Buffer.from(
      `<svg width="${width}" height="${height}"><defs><radialGradient id="g" cx="30%" cy="20%" r="90%"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
    );
    const jpg = await sharp(png)
      .blur(0.8)
      .composite([{ input: noise, blend: "overlay" }, { input: shade }])
      .jpeg({ quality: 92 })
      .toBuffer();
    doc.addPage([595.28, 841.89]).drawImage(await doc.embedJpg(jpg), { x: 0, y: 0, width: 595.28, height: 841.89 });
  }
  await page.close();
  const file = join(work, `contract-photos-${locale}.pdf`);
  writeFileSync(file, await doc.save());
  console.log(`sample: ${file}`);
  return file;
}

// name → steps that leave the page ready for the shot in a language; returns the element to capture.
const shots = {
  "pdf-a-word-convertir": async (page, l) => {
    await open(page, l, convSlug("pdf", "docx", l));
    await pick(page, l, [join(fixtures, "document.pdf")]);
    return toolBlock(page);
  },
  "pdf-a-word-resultado": async (page, l) => {
    await open(page, l, convSlug("pdf", "docx", l));
    await pick(page, l, [join(fixtures, "document.pdf")]);
    await page.getByRole("button", { name: msg(l, "Converter.convert"), exact: true }).click();
    await page.locator("a[download]").first().waitFor({ timeout: 60_000 });
    return toolBlock(page);
  },
  "formatos-convertir": async (page, l) => {
    await open(page, l, convSlug("jpg", "webp", l));
    await pick(page, l, [join(fixtures, "photo.jpg"), join(fixtures, "image.jpg")]);
    await page.getByText(msg(l, "ImageOptions.title"), { exact: true }).first().click();
    return toolBlock(page);
  },
  "heic-convertir": async (page, l) => {
    await open(page, l, convSlug("heic", "jpg", l));
    await pick(page, l, [join(fixtures, "photo.heic"), join(fixtures, "photo.heif")]);
    return toolBlock(page);
  },
  "pdf-excel-vista-previa": async (page, l) => {
    await open(page, l, toolSlug("pdf-to-excel", l));
    await pick(page, l, [join(fixtures, "table-pages.pdf")]);
    await page.getByText(msg(l, "PdfExcelTool.previewOf")).first().waitFor();
    return toolBlock(page);
  },
  "excel-csv-opciones": async (page, l) => {
    await open(page, l, toolSlug("excel-to-csv", l));
    await pick(page, l, [join(fixtures, "workbook.xlsx")]);
    // Semicolon in the languages whose Excel uses the decimal comma.
    await label(page, msg(l, l === "en" || l === "zh" ? "SheetTool.delimiterComma" : "SheetTool.delimiterSemicolon")).click();
    return toolBlock(page);
  },
  "transcribir-resultado": async (page, l) => {
    await open(page, l, toolSlug("audio-to-text", l));
    await pick(page, l, [join(fixtures, samples[l].speech)]);
    await page.getByRole("button", { name: msg(l, "Tools.audio-to-text.action"), exact: true }).click();
    const srt = msg(l, "TranscribeTool.download").replace("{format}", "SRT");
    await page.getByRole("button", { name: srt }).waitFor({ timeout: 300_000 });
    return toolBlock(page);
  },
  "leer-en-voz-alta": async (page, l) => {
    await open(page, l, toolSlug("text-to-speech", l));
    await mark(page);
    await page.getByRole("textbox", { name: msg(l, "ReadAloudTool.textLabel") }).fill(samples[l].read);
    // The AI voice looks the same everywhere (the test browser has no device voices);
    // Chinese has no AI voice, so it stays on the device voices.
    if (l !== "zh") await label(page, msg(l, "ReadAloudTool.engineAi")).click();
    return toolBlock(page);
  },
  "firmar-pdf-colocar": async (page, l, browser) => {
    await open(page, l, toolSlug("sign-pdf", l));
    await pick(page, l, [await authorizationPdf(browser, l)]);
    const pad = page.getByRole("img", { name: msg(l, "SignPdf.padLabel") });
    await pad.scrollIntoViewIfNeeded();
    const box = await pad.boundingBox();
    // A handwritten-looking stroke.
    await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * 0.65);
    await page.mouse.down();
    for (let i = 1; i <= 40; i++) {
      const t = i / 40;
      await page.mouse.move(box.x + box.width * (0.12 + t * 0.76), box.y + box.height * (0.6 - Math.sin(t * Math.PI * 3) * 0.25 * (1 - t)));
    }
    await page.mouse.up();
    await page.getByRole("button", { name: msg(l, "SignPdf.useSignature") }).click();
    const preview = page.getByTestId("sign-preview");
    await preview.scrollIntoViewIfNeeded();
    const area = await preview.boundingBox();
    // Just above the signature line (left 455–695 px, top 880 px of 794 × 1122).
    await page.mouse.click(area.x + area.width * 0.724, area.y + area.height * 0.765);
    return toolBlock(page);
  },
  "pdfa-opciones": async (page, l) => {
    await open(page, l, toolSlug("pdf-to-pdfa", l));
    await pick(page, l, [join(fixtures, "document.pdf")]);
    return toolBlock(page);
  },
  "comprimir-pdf-resultado": async (page, l, browser) => {
    const file = await photoContractPdf(browser, l);
    await open(page, l, toolSlug("compress-pdf", l));
    await pick(page, l, [file]);
    await label(page, msg(l, "ToolUi.levelRecommended")).click();
    await page.getByRole("button", { name: msg(l, "Tools.compress-pdf.action"), exact: true }).click();
    await page.locator("main a[download]").first().waitFor({ timeout: 120_000 });
    return toolBlock(page);
  },
};

const args = process.argv.slice(2);
const localeArg = args.find((a) => a.startsWith("--locale="));
const locales = localeArg ? localeArg.slice("--locale=".length).split(",") : ["es"];
const wanted = args.filter((a) => !a.startsWith("--"));
const names = wanted.length ? wanted : Object.keys(shots);
mkdirSync(outDir, { recursive: true });
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const browser = await chromium.launch({ executablePath });
for (const locale of locales) {
  const context = await browser.newContext({
    viewport: { width: 1000, height: 900 },
    deviceScaleFactor: 1.5,
    colorScheme: "light",
    locale: browserLocale[locale],
  });
  for (const name of names) {
    if (!shots[name]) throw new Error(`Unknown shot: ${name}`);
    const key = locale === "es" ? name : `${name}.${locale}`;
    const page = await context.newPage();
    const target = await shots[name](page, locale, browser);
    await page.evaluate(() => document.fonts.ready);
    // Let progress bars and the result animation settle.
    await page.waitForTimeout(600);
    // No ad slots in the screenshots.
    await page.evaluate(() => document.querySelectorAll("aside, [aria-hidden='true']:has(> span.invisible)").forEach((el) => el.remove()));
    // The sticky site header would cover the top of a tall block.
    await page.addStyleTag({ content: "body > div > header, header.sticky { position: static !important; }" });
    // A small margin around the block, in page coordinates.
    const box = await target.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
    });
    const margin = 16;
    const png = await page.screenshot({
      animations: "disabled",
      fullPage: true,
      clip: { x: Math.max(0, box.x - margin), y: Math.max(0, box.y - margin), width: box.width + 2 * margin, height: box.height + 2 * margin },
    });
    const webp = await sharp(png).webp({ quality: 82 }).toBuffer();
    const { width, height } = await sharp(webp).metadata();
    writeFileSync(join(outDir, `${key}.webp`), webp);
    // Displayed at CSS size (the page shows them at most 768 px wide).
    manifest[key] = { width: Math.round(width / 1.5), height: Math.round(height / 1.5) };
    console.log(`${key}.webp ${width}×${height} ${Math.round(webp.length / 1024)} KB`);
    await page.close();
  }
  await context.close();
}
await browser.close();
writeFileSync(manifestPath, `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2)}\n`);
