import { readFileSync } from "node:fs";
import { ArchiveReader, libarchiveWasm } from "libarchive-wasm";
const mod = await libarchiveWasm();
for (const f of process.argv.slice(2)) {
  console.log("==", f);
  try {
    const r = new ArchiveReader(mod, new Int8Array(readFileSync(f)));
    console.log(" enc?", r.hasEncryptedData());
    for (const e of r.entries()) {
      const info = [e.getFiletype(), JSON.stringify(e.getPathname()), e.getSize(), e.isEncrypted()];
      if (e.getFiletype() === "File") { try { const d = e.readData(); info.push("read", d?.length, d ? JSON.stringify(Buffer.from(d).toString().slice(0, 30)) : ""); } catch (x) { info.push("ERR " + x.message); } }
      console.log(" ", ...info);
    }
    console.log(" err:", mod.error_string(r.archive));
    r.free();
  } catch (x) { console.log(" THROW", x.message); }
}
