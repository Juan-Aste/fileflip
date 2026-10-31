// A PowerPoint deck (PPTX, Office Open XML) with one picture per slide, for
// "PDF to PowerPoint". Only the parts PowerPoint requires: presentation, one
// master, one blank layout and a theme; zipped with fflate.
import { strToU8, zipSync, type Zippable } from "fflate";

export interface SlideImage {
  jpeg: Uint8Array;
  /** The page's size in points (as the reader shows it). */
  width: number;
  height: number;
}

const EMU_PER_PT = 12700;
// PowerPoint's allowed slide sizes: 1 to 56 inches per side.
const MIN_EMU = 914400;
const MAX_EMU = 51206400;

const xml = (body: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${body}`;
const escape = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const rels = (list: [id: string, type: string, target: string][]) =>
  xml(
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list
      .map(([id, type, target]) => `<Relationship Id="${id}" Type="${type.startsWith("http") ? type : `${REL}/${type}`}" Target="${target}"/>`)
      .join("")}</Relationships>`,
  );

/**
 * Slide size in EMU for pages of `width`×`height` pt: the page's own size,
 * scaled when it is outside PowerPoint's limits (aspect ratio kept).
 */
export function slideSize(width: number, height: number): { cx: number; cy: number } {
  let cx = width * EMU_PER_PT;
  let cy = height * EMU_PER_PT;
  const up = Math.max(1, MIN_EMU / Math.min(cx, cy));
  cx *= up;
  cy *= up;
  const down = Math.min(1, MAX_EMU / Math.max(cx, cy));
  return { cx: Math.round(cx * down), cy: Math.round(cy * down) };
}

/** Where a page's picture goes on the slide: as large as fits, centered. */
function fit(image: SlideImage, size: { cx: number; cy: number }) {
  const scale = Math.min(size.cx / image.width, size.cy / image.height);
  const cx = Math.round(image.width * scale);
  const cy = Math.round(image.height * scale);
  return { x: Math.round((size.cx - cx) / 2), y: Math.round((size.cy - cy) / 2), cx, cy };
}

const emptyTree = `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;

function slideXml(n: number, box: ReturnType<typeof fit>, name: string) {
  return xml(
    `<p:sld xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"><p:cSld><p:spTree>${emptyTree}` +
      `<p:pic><p:nvPicPr><p:cNvPr id="2" name="${escape(name)} ${n}" descr="${escape(name)} ${n}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>` +
      `<p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>` +
      `<p:spPr><a:xfrm><a:off x="${box.x}" y="${box.y}"/><a:ext cx="${box.cx}" cy="${box.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>` +
      `</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
  );
}

const theme = xml(
  `<a:theme xmlns:a="${NS_A}" name="Office"><a:themeElements>` +
    `<a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>` +
    `<a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2>` +
    `<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6>` +
    `<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>` +
    `<a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>` +
    `<a:fmtScheme name="Office"><a:fillStyleLst>${'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'.repeat(3)}</a:fillStyleLst>` +
    `<a:lnStyleLst>${[6350, 12700, 19050].map((w) => `<a:ln w="${w}"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>`).join("")}</a:lnStyleLst>` +
    `<a:effectStyleLst>${"<a:effectStyle><a:effectLst/></a:effectStyle>".repeat(3)}</a:effectStyleLst>` +
    `<a:bgFillStyleLst>${'<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'.repeat(3)}</a:bgFillStyleLst></a:fmtScheme>` +
    `</a:themeElements></a:theme>`,
);

const master = xml(
  `<p:sldMaster xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>${emptyTree}</p:spTree></p:cSld>` +
    `<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>` +
    `<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`,
);

const layout = xml(
  `<p:sldLayout xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${emptyTree}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
);

/**
 * One slide per image. The slide size follows the first page; other pages
 * are fitted and centered on it (a deck has a single slide size).
 */
export function buildPptx(slides: readonly SlideImage[], { title = "", slideName = "Page" }: { title?: string; slideName?: string } = {}): Uint8Array {
  if (!slides.length) throw new Error("No slides");
  const size = slideSize(slides[0]!.width, slides[0]!.height);
  const files: Zippable = {
    "[Content_Types].xml": strToU8(
      xml(
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/>` +
          `<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>` +
          `<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>` +
          `<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>` +
          `<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>` +
          `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
          `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
          slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("") +
          `</Types>`,
      ),
    ),
    "_rels/.rels": strToU8(
      rels([
        ["rId1", "officeDocument", "ppt/presentation.xml"],
        ["rId2", "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties", "docProps/core.xml"],
        ["rId3", "extended-properties", "docProps/app.xml"],
      ]),
    ),
    "docProps/core.xml": strToU8(
      xml(
        `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${escape(title)}</dc:title><dc:creator>Fileflect</dc:creator></cp:coreProperties>`,
      ),
    ),
    "docProps/app.xml": strToU8(
      xml(`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Fileflect</Application><Slides>${slides.length}</Slides></Properties>`),
    ),
    "ppt/presentation.xml": strToU8(
      xml(
        `<p:presentation xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}" saveSubsetFonts="1">` +
          `<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>` +
          `<p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`).join("")}</p:sldIdLst>` +
          `<p:sldSz cx="${size.cx}" cy="${size.cy}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
      ),
    ),
    "ppt/_rels/presentation.xml.rels": strToU8(
      rels([
        ["rId1", "slideMaster", "slideMasters/slideMaster1.xml"],
        ["rId2", "theme", "theme/theme1.xml"],
        ...slides.map((_, i): [string, string, string] => [`rId${i + 3}`, "slide", `slides/slide${i + 1}.xml`]),
      ]),
    ),
    "ppt/slideMasters/slideMaster1.xml": strToU8(master),
    "ppt/slideMasters/_rels/slideMaster1.xml.rels": strToU8(
      rels([
        ["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"],
        ["rId2", "theme", "../theme/theme1.xml"],
      ]),
    ),
    "ppt/slideLayouts/slideLayout1.xml": strToU8(layout),
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels": strToU8(rels([["rId1", "slideMaster", "../slideMasters/slideMaster1.xml"]])),
    "ppt/theme/theme1.xml": strToU8(theme),
  };
  slides.forEach((image, i) => {
    const n = i + 1;
    files[`ppt/slides/slide${n}.xml`] = strToU8(slideXml(n, fit(image, size), slideName));
    files[`ppt/slides/_rels/slide${n}.xml.rels`] = strToU8(
      rels([
        ["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"],
        ["rId2", "image", `../media/image${n}.jpeg`],
      ]),
    );
    // JPEGs are already compressed.
    files[`ppt/media/image${n}.jpeg`] = [image.jpeg, { level: 0 }];
  });
  return zipSync(files, { level: 6 });
}
