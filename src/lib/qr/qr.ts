// QR codes: what goes inside (text, Wi-Fi, contact), the module matrix
// (qrcode, MIT) and its SVG or RGBA rendering. Pure, so it runs in tests,
// the page and workers alike.
import QRCode from "qrcode";
import { ConversionError } from "@/lib/convert-error";

export type ErrorCorrection = "L" | "M" | "Q" | "H";

export interface WifiNetwork {
  ssid: string;
  password: string;
  security: "WPA" | "WEP" | "nopass";
  hidden: boolean;
}

export interface Contact {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  organization: string;
  url: string;
}

/** Wi-Fi payload as phones read it; \ ; , : " are escaped with a backslash. */
export function wifiPayload({ ssid, password, security, hidden }: WifiNetwork): string {
  const esc = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");
  const fields = [`T:${security}`, `S:${esc(ssid)}`];
  if (security !== "nopass") fields.push(`P:${esc(password)}`);
  if (hidden) fields.push("H:true");
  return `WIFI:${fields.join(";")};;`;
}

/** vCard 3.0 with the filled fields only (RFC 2426 escaping). */
export function contactPayload(contact: Contact): string {
  const esc = (value: string) => value.trim().replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([;,])/g, "\\$1");
  const fullName = [contact.firstName, contact.lastName].map((s) => s.trim()).filter(Boolean).join(" ");
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${esc(contact.lastName)};${esc(contact.firstName)};;;`, `FN:${esc(fullName)}`];
  if (contact.organization.trim()) lines.push(`ORG:${esc(contact.organization)}`);
  if (contact.phone.trim()) lines.push(`TEL;TYPE=CELL:${esc(contact.phone)}`);
  if (contact.email.trim()) lines.push(`EMAIL:${esc(contact.email)}`);
  if (contact.url.trim()) lines.push(`URL:${esc(contact.url)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export interface QrMatrix {
  size: number;
  /** Row-major, 1 = dark module. */
  modules: Uint8Array;
}

/**
 * The QR matrix for the text, or throws `qrTooLong` when it does not fit in
 * the largest QR code at that error correction level.
 */
export function qrMatrix(text: string, errorCorrectionLevel: ErrorCorrection): QrMatrix {
  try {
    const { modules } = QRCode.create(text, { errorCorrectionLevel });
    return { size: modules.size, modules: Uint8Array.from(modules.data) };
  } catch (error) {
    if (error instanceof Error && /too big|amount of data/i.test(error.message)) throw new ConversionError("qrTooLong");
    throw error;
  }
}

/** The 4-module quiet zone the standard asks for. */
export const QUIET_ZONE = 4;

export interface QrStyle {
  dark: string;
  light: string;
}

/** SVG with one path (crisp at any size); `light` may be "transparent". */
export function qrSvg({ size, modules }: QrMatrix, { dark, light }: QrStyle): string {
  const total = size + 2 * QUIET_ZONE;
  let path = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!modules[y * size + x]) continue;
      // Runs of dark modules in a row become one rectangle.
      let run = 1;
      while (x + run < size && modules[y * size + x + run]) run++;
      path += `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h${run}v1h-${run}z`;
      x += run - 1;
    }
  }
  const background = light === "transparent" ? "" : `<rect width="${total}" height="${total}" fill="${light}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">${background}<path fill="${dark}" d="${path}"/></svg>\n`;
}

/** "#1a2b3c" → [r, g, b, a]; "transparent" → fully transparent. */
export function parseColor(color: string): [number, number, number, number] {
  if (color === "transparent") return [0, 0, 0, 0];
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) throw new Error(`Bad color ${color}`);
  const n = parseInt(match[1]!, 16);
  return [n >> 16, (n >> 8) & 0xff, n & 0xff, 255];
}

/** RGBA pixels with whole pixels per module, as close to `targetPx` as possible. */
export function qrPixels(matrix: QrMatrix, style: QrStyle, targetPx: number): { width: number; height: number; data: Uint8ClampedArray } {
  const total = matrix.size + 2 * QUIET_ZONE;
  const scale = Math.max(1, Math.round(targetPx / total));
  const side = total * scale;
  const data = new Uint8ClampedArray(side * side * 4);
  const dark = parseColor(style.dark);
  const light = parseColor(style.light);
  for (let py = 0; py < side; py++) {
    const my = Math.floor(py / scale) - QUIET_ZONE;
    for (let px = 0; px < side; px++) {
      const mx = Math.floor(px / scale) - QUIET_ZONE;
      const on = mx >= 0 && my >= 0 && mx < matrix.size && my < matrix.size && matrix.modules[my * matrix.size + mx] === 1;
      data.set(on ? dark : light, (py * side + px) * 4);
    }
  }
  return { width: side, height: side, data };
}

/** WCAG contrast ratio between two "#rrggbb" colors (scanners need dark on light). */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = parseColor(hex).slice(0, 3).map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
