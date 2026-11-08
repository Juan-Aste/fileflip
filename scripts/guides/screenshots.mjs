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
import { PDFDocument, PDFHexString, PDFName, rgb } from "pdf-lib";
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

/** A product photo drawn as SVG (a ceramic mug on a wooden table against a wall), nothing personal. */
async function productPhoto() {
  const file = join(work, "taza.jpg");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">` +
    `<defs>` +
    `<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9b9a6"/><stop offset="1" stop-color="#b3a28d"/></linearGradient>` +
    `<linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a35"/><stop offset="1" stop-color="#6b4226"/></linearGradient>` +
    `<linearGradient id="mug" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#14706b"/><stop offset="0.35" stop-color="#2bb3a8"/><stop offset="1" stop-color="#0c4f4b"/></linearGradient>` +
    `<radialGradient id="shadow"><stop offset="0" stop-color="#000" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
    `</defs>` +
    `<rect width="1200" height="620" fill="url(#wall)"/><rect y="620" width="1200" height="280" fill="url(#wood)"/>` +
    Array.from({ length: 9 }, (_, i) => `<path d="M0 ${650 + i * 28} C 300 ${640 + i * 28}, 800 ${662 + i * 28}, 1200 ${648 + i * 28}" stroke="#5a3820" stroke-opacity="0.35" stroke-width="2" fill="none"/>`).join("") +
    `<ellipse cx="590" cy="735" rx="230" ry="34" fill="url(#shadow)"/>` +
    `<path d="M745 360 C 880 360, 880 600, 745 600" stroke="#106662" stroke-width="44" fill="none"/>` +
    `<path d="M430 300 L770 300 L755 700 Q 600 740 445 700 Z" fill="url(#mug)"/>` +
    `<ellipse cx="600" cy="300" rx="170" ry="34" fill="#0c4f4b"/><ellipse cx="600" cy="300" rx="150" ry="24" fill="#3a2414"/>` +
    `<rect x="520" y="430" width="160" height="110" rx="14" fill="#f4efe6"/><circle cx="600" cy="485" r="30" fill="#e2683c"/>` +
    `</svg>`;
  writeFileSync(file, await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer());
  return file;
}

/** Clicks a pill of a ChoiceGroup by its exact text (the radio itself is visually hidden). */
const pill = (page, text) =>
  page.locator("label").filter({ hasText: new RegExp(`^${text.replace(/[()]/g, "\\$&")}$`) }).first().click();

/** "Remove background" in rectangle mode with the product photo, once the cut is ready. */
async function removeBackgroundProduct(page, l) {
  await open(page, l, toolSlug("remove-background", l));
  await pill(page, msg(l, "RemoveBackgroundTool.methodRect"));
  await pick(page, l, [await productPhoto()]);
  const ready = msg(l, "RemoveBackgroundTool.status").split("{percent}")[0].trim();
  await page.getByRole("status").filter({ hasText: ready }).first().waitFor({ timeout: 60_000 });
}

// Two versions of a short contract (line by line) and of a school paragraph
// (word by word), in each language, with visible differences.
const compareSamples = {
  es: {
    contractA:
      "Cláusula 1. El prestador entregará el sitio web el 15 de marzo.\nCláusula 2. El cliente pagará 1.200 dólares en dos cuotas.\nCláusula 3. Cualquier cambio deberá acordarse por escrito.\nCláusula 4. El contrato podrá rescindirse con 30 días de aviso.",
    contractB:
      "Cláusula 1. El prestador entregará el sitio web el 30 de marzo.\nCláusula 2. El cliente pagará 1.500 dólares en tres cuotas.\nCláusula 3. Cualquier cambio deberá acordarse por escrito.\nCláusula 4. El contrato podrá rescindirse con 60 días de aviso.\nCláusula 5. El prestador mantendrá el sitio durante seis meses.",
    essayA:
      "La fotosíntesis es el proceso por el cual las plantas transforman la luz del sol en energía química. Ocurre principalmente en las hojas, dentro de los cloroplastos.",
    essayB:
      "La fotosíntesis es el proceso mediante el cual las plantas, las algas y algunas bacterias transforman la luz del sol en energía química. Ocurre sobre todo en las hojas, dentro de los cloroplastos, y libera oxígeno.",
  },
  en: {
    contractA:
      "Clause 1. The provider will deliver the website on March 15.\nClause 2. The client will pay 1,200 dollars in two installments.\nClause 3. Any change must be agreed in writing.\nClause 4. Either party may terminate with 30 days' notice.",
    contractB:
      "Clause 1. The provider will deliver the website on March 30.\nClause 2. The client will pay 1,500 dollars in three installments.\nClause 3. Any change must be agreed in writing.\nClause 4. Either party may terminate with 60 days' notice.\nClause 5. The provider will maintain the site for six months.",
    essayA:
      "Photosynthesis is the process by which plants turn sunlight into chemical energy. It takes place mainly in the leaves, inside the chloroplasts.",
    essayB:
      "Photosynthesis is the process through which plants, algae and some bacteria turn sunlight into chemical energy. It takes place mostly in the leaves, inside the chloroplasts, and releases oxygen.",
  },
  pt: {
    contractA:
      "Cláusula 1. O prestador entregará o site em 15 de março.\nCláusula 2. O cliente pagará 1.200 reais em duas parcelas.\nCláusula 3. Qualquer alteração deverá ser combinada por escrito.\nCláusula 4. O contrato poderá ser rescindido com 30 dias de aviso.",
    contractB:
      "Cláusula 1. O prestador entregará o site em 30 de março.\nCláusula 2. O cliente pagará 1.500 reais em três parcelas.\nCláusula 3. Qualquer alteração deverá ser combinada por escrito.\nCláusula 4. O contrato poderá ser rescindido com 60 dias de aviso.\nCláusula 5. O prestador fará a manutenção do site durante seis meses.",
    essayA:
      "A fotossíntese é o processo pelo qual as plantas transformam a luz do sol em energia química. Ela ocorre principalmente nas folhas, dentro dos cloroplastos.",
    essayB:
      "A fotossíntese é o processo por meio do qual as plantas, as algas e algumas bactérias transformam a luz do sol em energia química. Ela ocorre sobretudo nas folhas, dentro dos cloroplastos, e libera oxigênio.",
  },
  fr: {
    contractA:
      "Article 1. Le prestataire livrera le site web le 15 mars.\nArticle 2. Le client paiera 1 200 euros en deux versements.\nArticle 3. Toute modification devra être convenue par écrit.\nArticle 4. Le contrat pourra être résilié avec un préavis de 30 jours.",
    contractB:
      "Article 1. Le prestataire livrera le site web le 30 mars.\nArticle 2. Le client paiera 1 500 euros en trois versements.\nArticle 3. Toute modification devra être convenue par écrit.\nArticle 4. Le contrat pourra être résilié avec un préavis de 60 jours.\nArticle 5. Le prestataire assurera la maintenance du site pendant six mois.",
    essayA:
      "La photosynthèse est le processus par lequel les plantes transforment la lumière du soleil en énergie chimique. Elle a lieu principalement dans les feuilles, à l’intérieur des chloroplastes.",
    essayB:
      "La photosynthèse est le processus grâce auquel les plantes, les algues et certaines bactéries transforment la lumière du soleil en énergie chimique. Elle a lieu surtout dans les feuilles, à l’intérieur des chloroplastes, et libère de l’oxygène.",
  },
  zh: {
    contractA:
      "第一条 服务方应于 3 月 15 日交付网站。\n第二条 客户分两期支付 1200 元。\n第三条 任何变更均须以书面形式约定。\n第四条 任何一方可提前 30 天通知解除合同。",
    contractB:
      "第一条 服务方应于 3 月 30 日交付网站。\n第二条 客户分三期支付 1500 元。\n第三条 任何变更均须以书面形式约定。\n第四条 任何一方可提前 60 天通知解除合同。\n第五条 服务方负责网站六个月的维护。",
    essayA: "光合作用是植物把阳光转化为化学能的过程。它主要发生在叶片的叶绿体中。",
    essayB: "光合作用是植物、藻类和部分细菌把阳光转化为化学能的过程。它大多发生在叶片的叶绿体中，并释放氧气。",
  },
};

/** Fills both boxes of Compare text, picks the mode and compares. */
async function compareTexts(page, l, a, b, mode) {
  await open(page, l, toolSlug("compare-text", l));
  await mark(page);
  await page.getByRole("textbox", { name: msg(l, "TextTools.textA"), exact: true }).fill(a);
  await page.getByRole("textbox", { name: msg(l, "TextTools.textB"), exact: true }).fill(b);
  await label(page, msg(l, mode === "line" ? "TextTools.byLine" : "TextTools.byWord")).click();
  await page.getByRole("button", { name: msg(l, "TextTools.compare"), exact: true }).click();
  await page.getByRole("heading", { name: msg(l, "TextTools.differences") }).waitFor();
  return toolBlock(page);
}

/**
 * An illustrated, made-up portrait (no real person) for the ID photo shots:
 * 1200 × 1600 JPEG, head and eyes where the 3.5 × 4.5 cm framing guide expects them.
 */
async function portraitJpg(locale) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef2f5"/><stop offset="1" stop-color="#dde3e8"/></linearGradient>
    <radialGradient id="skin" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#e9b996"/><stop offset="1" stop-color="#c98f6b"/></radialGradient>
    <linearGradient id="sweater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d5a80"/><stop offset="1" stop-color="#2b4162"/></linearGradient>
  </defs>
  <rect width="1200" height="1600" fill="url(#wall)"/>
  <path d="M120 1600 C140 1430 300 1360 480 1330 L720 1330 C900 1360 1060 1430 1080 1600 Z" fill="url(#sweater)"/>
  <path d="M500 1140 L700 1140 L715 1350 C660 1400 540 1400 485 1350 Z" fill="#c08564"/>
  <path d="M485 1335 C540 1395 660 1395 715 1335 L760 1345 C700 1430 500 1430 440 1345 Z" fill="#2b4162"/>
  <ellipse cx="600" cy="640" rx="345" ry="430" fill="#3b2a20"/>
  <ellipse cx="292" cy="830" rx="42" ry="80" fill="#cf9572"/>
  <ellipse cx="908" cy="830" rx="42" ry="80" fill="#cf9572"/>
  <ellipse cx="600" cy="860" rx="305" ry="465" fill="url(#skin)"/>
  <path d="M300 640 C320 380 480 300 620 310 C780 320 900 420 905 640 C860 470 760 420 600 430 C460 440 360 500 300 640 Z" fill="#3b2a20"/>
  <path d="M420 628 C455 610 515 610 545 624" stroke="#3b2a20" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M655 624 C685 610 745 610 780 628" stroke="#3b2a20" stroke-width="14" fill="none" stroke-linecap="round"/>
  <ellipse cx="482" cy="690" rx="44" ry="22" fill="#fbfbf8"/>
  <ellipse cx="718" cy="690" rx="44" ry="22" fill="#fbfbf8"/>
  <circle cx="482" cy="690" r="17" fill="#4a3426"/>
  <circle cx="718" cy="690" r="17" fill="#4a3426"/>
  <circle cx="488" cy="684" r="5" fill="#fff"/>
  <circle cx="724" cy="684" r="5" fill="#fff"/>
  <path d="M600 720 C592 800 575 860 570 900 C585 918 615 918 632 905" stroke="#a8714f" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M525 1030 C565 1042 635 1042 675 1030" stroke="#9c5a4a" stroke-width="12" fill="none" stroke-linecap="round"/>
</svg>`;
  const file = join(work, `${{ es: "retrato", en: "portrait", pt: "retrato", fr: "portrait", zh: "portrait" }[locale]}.jpg`);
  writeFileSync(file, await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer());
  return file;
}

// Sample enrollment form with real AcroForm fields, in each language.
// File names in each language (pinyin for Chinese: Playwright's setInputFiles drops files whose path is not ASCII).
const formFileName = { es: "ficha-inscripcion.pdf", en: "enrollment-form.pdf", pt: "ficha-inscricao.pdf", fr: "fiche-inscription.pdf", zh: "baomingbiao.pdf" };
const formSamples = {
  es: {
    title: "Ficha de inscripción — Taller de fotografía",
    intro: "Completa esta ficha y envíala por correo antes del inicio del taller. Los datos solo se usan para organizar los grupos.",
    name: "Nombre y apellido",
    birth: "Fecha de nacimiento (dd/mm/aaaa)",
    email: "Correo electrónico",
    shift: "Turno",
    shifts: ["Mañana", "Tarde", "Noche"],
    level: "Nivel",
    levels: ["Inicial", "Intermedio", "Avanzado"],
    comments: "Comentarios",
    rules: "Acepto el reglamento del taller",
    news: "Quiero recibir novedades por correo",
    sign: "Firma",
    values: { name: "Laura Gómez", birth: "14/03/1990", email: "laura.gomez@example.com", shift: "Tarde", level: "Intermedio" },
  },
  en: {
    title: "Enrollment form — Photography workshop",
    intro: "Fill in this form and email it back before the workshop starts. Your details are only used to organize the groups.",
    name: "Full name",
    birth: "Date of birth (MM/DD/YYYY)",
    email: "Email address",
    shift: "Session",
    shifts: ["Morning", "Afternoon", "Evening"],
    level: "Level",
    levels: ["Beginner", "Intermediate", "Advanced"],
    comments: "Comments",
    rules: "I accept the workshop rules",
    news: "Send me news by email",
    sign: "Signature",
    values: { name: "Laura Green", birth: "03/14/1990", email: "laura.green@example.com", shift: "Afternoon", level: "Intermediate" },
  },
  pt: {
    title: "Ficha de inscrição — Oficina de fotografia",
    intro: "Preencha esta ficha e envie por e-mail antes do início da oficina. Os dados são usados apenas para organizar as turmas.",
    name: "Nome completo",
    birth: "Data de nascimento (dd/mm/aaaa)",
    email: "E-mail",
    shift: "Turno",
    shifts: ["Manhã", "Tarde", "Noite"],
    level: "Nível",
    levels: ["Iniciante", "Intermediário", "Avançado"],
    comments: "Comentários",
    rules: "Aceito o regulamento da oficina",
    news: "Quero receber novidades por e-mail",
    sign: "Assinatura",
    values: { name: "Laura Souza", birth: "14/03/1990", email: "laura.souza@example.com", shift: "Tarde", level: "Intermediário" },
  },
  fr: {
    title: "Fiche d’inscription — Atelier photo",
    intro: "Remplissez cette fiche et renvoyez-la par e-mail avant le début de l’atelier. Vos données servent uniquement à organiser les groupes.",
    name: "Nom et prénom",
    birth: "Date de naissance (jj/mm/aaaa)",
    email: "Adresse e-mail",
    shift: "Créneau",
    shifts: ["Matin", "Après-midi", "Soir"],
    level: "Niveau",
    levels: ["Débutant", "Intermédiaire", "Avancé"],
    comments: "Commentaires",
    rules: "J’accepte le règlement de l’atelier",
    news: "Je souhaite recevoir les actualités par e-mail",
    sign: "Signature",
    values: { name: "Laura Martin", birth: "14/03/1990", email: "laura.martin@example.com", shift: "Après-midi", level: "Intermédiaire" },
  },
  zh: {
    title: "报名表 — 摄影工作坊",
    intro: "请在工作坊开始前填写本表并通过邮件发回。所填信息仅用于分组。",
    name: "姓名",
    birth: "出生日期（年-月-日）",
    email: "电子邮箱",
    shift: "时段",
    shifts: ["上午", "下午", "晚上"],
    level: "水平",
    levels: ["入门", "中级", "高级"],
    comments: "备注",
    rules: "我同意工作坊的规定",
    news: "通过邮件接收活动通知",
    sign: "签名",
    values: { name: "李明", birth: "1990-03-14", email: "li.ming@example.com", shift: "下午", level: "中级" },
  },
};

/**
 * A one-page form (A4) with real AcroForm fields: text (one with a length limit,
 * one multiline), radio buttons, a dropdown and checkboxes. The page is drawn
 * from HTML (any script) and the fields are added with pdf-lib, each with a
 * tooltip (/TU) in the sample's language, which the tool shows as its label.
 */
async function enrollmentFormPdf(browser, locale) {
  const s = formSamples[locale];
  const page = await browser.newPage();
  // Positions in CSS px of a 794 × 1122 page (1 px = 0.75 pt).
  const text = (left, top, content, style = "") => `<div style="position:absolute;left:${left}px;top:${top}px;${style}">${content}</div>`;
  const parts = [
    text(96, 80, s.title, "font-size:24px;font-weight:bold"),
    text(96, 126, s.intro, "width:602px;color:#444"),
    text(96, 204, s.name),
    text(96, 274, s.birth),
    text(350, 274, s.email),
    text(96, 344, s.shift),
    ...s.shifts.map((o, i) => text(122 + i * 150, 372, o)),
    text(96, 414, s.level),
    text(96, 484, s.comments),
    text(122, 620, s.rules),
    text(122, 652, s.news),
    `<div style="position:absolute;left:455px;top:880px;width:240px;border-top:1px solid #222;text-align:center;font-size:13px;padding-top:6px">${s.sign}</div>`,
  ];
  await page.setContent(`<body style="margin:0;font:15px/1.5 sans-serif;color:#222"><div style="position:relative;width:794px;height:1122px">${parts.join("")}</div></body>`);
  const doc = await PDFDocument.load(await page.pdf({ width: "794px", height: "1122px", printBackground: true }));
  await page.close();
  const pdfPage = doc.getPage(0);
  const form = doc.getForm();
  const H = pdfPage.getHeight();
  // A box in CSS px → pdf-lib options in points (origin bottom-left).
  const at = (left, top, width, height) => ({ x: left * 0.75, y: H - (top + height) * 0.75, width: width * 0.75, height: height * 0.75, borderColor: rgb(0.55, 0.55, 0.6), borderWidth: 1 });
  const tip = (field, label) => field.acroField.dict.set(PDFName.of("TU"), PDFHexString.fromText(label));
  const name = form.createTextField("alumno.nombre");
  name.addToPage(pdfPage, at(96, 230, 602, 28));
  tip(name, s.name);
  const birth = form.createTextField("alumno.fecha_nacimiento");
  birth.setMaxLength(10);
  birth.addToPage(pdfPage, at(96, 300, 200, 28));
  tip(birth, s.birth);
  const email = form.createTextField("alumno.correo");
  email.addToPage(pdfPage, at(350, 300, 348, 28));
  tip(email, s.email);
  const shift = form.createRadioGroup("turno");
  s.shifts.forEach((o, i) => shift.addOptionToPage(o, pdfPage, at(100 + i * 150, 374, 16, 16)));
  tip(shift, s.shift);
  const level = form.createDropdown("nivel");
  level.addOptions(s.levels);
  level.addToPage(pdfPage, at(96, 440, 240, 28));
  tip(level, s.level);
  const comments = form.createTextField("comentarios");
  comments.enableMultiline();
  comments.addToPage(pdfPage, at(96, 510, 602, 84));
  tip(comments, s.comments);
  for (const [id, label, top] of [["reglamento", s.rules, 622], ["novedades", s.news, 654]]) {
    const box = form.createCheckBox(id);
    box.addToPage(pdfPage, at(98, top, 16, 16));
    tip(box, label);
  }
  const file = join(work, formFileName[locale]);
  writeFileSync(file, await doc.save());
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
  "quitar-fondo-producto": async (page, l) => {
    await removeBackgroundProduct(page, l);
    // The transparent result, seen on the checkerboard.
    await pill(page, msg(l, "RemoveBackgroundTool.viewChecker"));
    await page.waitForTimeout(400);
    return toolBlock(page);
  },
  "quitar-fondo-blanco": async (page, l) => {
    await removeBackgroundProduct(page, l);
    // White background and JPG, as most online shops ask.
    await pill(page, msg(l, "RemoveBackgroundTool.white"));
    await pill(page, "JPG");
    await page.waitForTimeout(400);
    return toolBlock(page);
  },
  "comparar-textos-lineas": (page, l) => compareTexts(page, l, compareSamples[l].contractA, compareSamples[l].contractB, "line"),
  "comparar-textos-palabras": (page, l) => compareTexts(page, l, compareSamples[l].essayA, compareSamples[l].essayB, "word"),
  "foto-carnet-encuadrar": async (page, l) => {
    await open(page, l, toolSlug("id-photo", l));
    await pick(page, l, [await portraitJpg(l)]);
    await page.getByText(msg(l, "IdPhotoTool.frameHint")).waitFor({ timeout: 30_000 });
    return toolBlock(page);
  },
  "foto-carnet-resultado": async (page, l) => {
    await open(page, l, toolSlug("id-photo", l));
    await pick(page, l, [await portraitJpg(l)]);
    await page.getByText(msg(l, "IdPhotoTool.frameHint")).waitFor({ timeout: 30_000 });
    await page.getByRole("button", { name: msg(l, "Tools.id-photo.action"), exact: true }).click();
    // The result message itself ("… 8 copies …"), not the same words in the page's About text.
    const [before, after] = msg(l, "IdPhotoTool.doneSheet").split("{copies}");
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await page.getByText(new RegExp(`^${escape(before)}\\d+${escape(after)}$`)).waitFor({ timeout: 60_000 });
    return toolBlock(page);
  },
  "rellenar-formulario-campos": async (page, l, browser) => {
    const s = formSamples[l];
    // Wide enough for the fields and the preview side by side.
    await page.setViewportSize({ width: 1100, height: 900 });
    await open(page, l, toolSlug("fill-pdf-form", l));
    await pick(page, l, [await enrollmentFormPdf(browser, l)]);
    await page.getByTestId("form-preview").locator("img").waitFor({ timeout: 30_000 });
    await page.getByLabel(s.birth, { exact: true }).fill(s.values.birth);
    await page.getByLabel(s.email, { exact: true }).fill(s.values.email);
    await page.getByLabel(s.values.shift, { exact: true }).check();
    await page.getByLabel(s.level, { exact: true }).selectOption(s.values.level);
    await page.getByLabel(s.rules, { exact: true }).check();
    // The field being filled is highlighted in the preview.
    await page.getByLabel(s.name, { exact: true }).fill(s.values.name);
    return toolBlock(page);
  },
  "rellenar-formulario-sin-campos": async (page, l) => {
    await open(page, l, toolSlug("fill-pdf-form", l));
    await pick(page, l, [join(fixtures, "document.pdf")]);
    await page.getByText(msg(l, "FillPdfForm.editPdfLink")).waitFor({ timeout: 30_000 });
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
