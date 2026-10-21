// Password protection with qpdf (compiled to WASM). The engine is passed in,
// so the PDF worker loads the browser build and tests load it from disk.
import { PDFDocument } from "pdf-lib";
import { ConversionError } from "@/lib/convert-error";

/** The part of the Emscripten module we use. */
export interface Qpdf {
  callMain(args: string[]): number;
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
  };
}

/** A fresh qpdf instance per job: nothing from a previous file stays in its memory. */
export type QpdfFactory = () => Promise<Qpdf>;

export interface Permissions {
  print: boolean;
  copy: boolean;
  modify: boolean;
}

export const MAX_PASSWORD_LENGTH = 128;

const IN = "/input.pdf";
const OUT = "/output.pdf";
// qpdf exit codes: 0 = done, 3 = done with warnings (a slightly damaged file it repaired).
const ok = (code: number) => code === 0 || code === 3;

/** Whether the file has an /Encrypt dictionary (open password or only permissions). */
async function isEncrypted(bytes: Uint8Array): Promise<boolean> {
  let doc: PDFDocument;
  let pages = 0;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    pages = doc.getPageCount();
  } catch {
    throw new ConversionError("fileDamaged");
  }
  // pdf-lib skips what it can't parse: garbage comes out as a PDF without pages.
  if (pages === 0) throw new ConversionError("fileDamaged");
  return doc.isEncrypted;
}

function validPassword(password: string) {
  if (!password || password.length > MAX_PASSWORD_LENGTH) throw new ConversionError("invalidRequest");
}

/** A random owner password: permissions can then only be lifted with the open password. */
function randomOwnerPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Encrypts with AES-256 and an open password. A PDF that is already encrypted
 * is refused: re-encrypting would drop permissions set by someone else.
 */
export async function protectPdf(
  bytes: Uint8Array,
  password: string,
  permissions: Permissions,
  load: QpdfFactory,
): Promise<Uint8Array> {
  validPassword(password);
  if (await isEncrypted(bytes)) throw new ConversionError("pdfAlreadyProtected");
  const qpdf = await load();
  qpdf.FS.writeFile(IN, bytes);
  // The "--name=value" forms keep a password starting with "@" (qpdf's
  // argument files) or "-" from being read as anything but a password.
  const code = qpdf.callMain([
    "--encrypt",
    `--user-password=${password}`,
    `--owner-password=${randomOwnerPassword()}`,
    "--bits=256",
    `--print=${permissions.print ? "full" : "none"}`,
    `--extract=${permissions.copy ? "y" : "n"}`,
    `--modify=${permissions.modify ? "all" : "none"}`,
    "--",
    IN,
    OUT,
  ]);
  if (!ok(code)) throw new ConversionError("fileDamaged");
  return qpdf.FS.readFile(OUT);
}

/** Removes the encryption, given the open (or owner) password. */
export async function unlockPdf(bytes: Uint8Array, password: string, load: QpdfFactory): Promise<Uint8Array> {
  validPassword(password);
  if (!(await isEncrypted(bytes))) throw new ConversionError("pdfNotProtected");
  const qpdf = await load();
  qpdf.FS.writeFile(IN, bytes);
  const code = qpdf.callMain([`--password=${password}`, "--decrypt", IN, OUT]);
  // pdf-lib could read the file's structure, so a failure here is the password.
  if (!ok(code)) throw new ConversionError("pdfWrongPassword");
  return qpdf.FS.readFile(OUT);
}
