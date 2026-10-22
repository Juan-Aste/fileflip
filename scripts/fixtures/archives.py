"""Archive fixtures for the extract tools, written with Python's own zipfile,
tarfile and gzip (independent of the fflate code they test):
`python3 -I scripts/fixtures/archives.py`.

Valid: archive.zip, archive.tar, archive.tar.gz, text.txt.gz, legacy-cp437.zip.
Hostile (corrupt/): zip-slip.zip, symlink.zip, links.tar, bomb-declared.zip,
lying-size.zip, encrypted.zip, truncated.zip, truncated.tar.gz.
"""
import gzip
import io
import os
import struct
import tarfile
import time
import zipfile

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tests", "fixtures")
CORRUPT = os.path.join(ROOT, "corrupt")
MTIME = time.mktime((2024, 5, 17, 12, 30, 0, 0, 0, -1))
DATE = (2024, 5, 17, 12, 30, 0)


def read(name):
    with open(os.path.join(ROOT, name), "rb") as f:
        return f.read()


def write(path, data):
    with open(path, "wb") as f:
        f.write(data)
    print(f"{os.path.relpath(path, ROOT)}: {len(data)} bytes")


# The same tree in every valid archive: folders, UTF-8 names, an empty file and an empty folder.
TREE = [
    ("docs/readme.txt", "Léeme: archivo de prueba de Fileflect. ñandú 中文\n".encode() * 20),
    ("docs/año 2024/notas — 中文.txt", "Notas con acentos: canción, pingüino.\n".encode()),
    ("images/image.png", read("image.png")),
    ("document-1page.pdf", read("document-1page.pdf")),
    ("empty.txt", b""),
]
DIRS = ["docs/", "docs/año 2024/", "images/", "vacía/"]


def make_zip():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for d in DIRS:
            z.writestr(zipfile.ZipInfo(d, DATE), b"")
        for name, data in TREE:
            info = zipfile.ZipInfo(name, DATE)
            info.compress_type = zipfile.ZIP_STORED if name.endswith(".png") else zipfile.ZIP_DEFLATED
            z.writestr(info, data)
    return buf.getvalue()


def make_tar(mode):
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode=mode, format=tarfile.PAX_FORMAT) as t:
        for d in DIRS:
            info = tarfile.TarInfo(d.rstrip("/"))
            info.type, info.mtime, info.mode = tarfile.DIRTYPE, MTIME, 0o755
            t.addfile(info)
        for name, data in TREE:
            info = tarfile.TarInfo(name)
            info.size, info.mtime, info.mode = len(data), MTIME, 0o644
            t.addfile(info, io.BytesIO(data))
        # A name longer than ustar's 100 + 155 bytes needs a PAX header.
        long = "deep/" + "carpeta-con-nombre-largo/" * 12 + "final.txt"
        info = tarfile.TarInfo(long)
        info.size, info.mtime = 4, MTIME
        t.addfile(info, io.BytesIO(b"long"))
    return buf.getvalue()


def stored_zip(entries, flags=0):
    """A minimal ZIP written by hand: entries are (raw name bytes, data, flags)."""
    import zlib

    out, central = b"", b""
    for raw, data in entries:
        crc = zlib.crc32(data)
        local = struct.pack("<IHHHHHIIIHH", 0x04034B50, 20, flags, 0, 0, 0, crc, len(data), len(data), len(raw), 0)
        central += struct.pack(
            "<IHHHHHHIIIHHHHHII", 0x02014B50, 20, 20, flags, 0, 0, 0, crc, len(data), len(data), len(raw), 0, 0, 0, 0, 0, len(out)
        ) + raw
        out += local + raw + data
    end = struct.pack("<IHHHHIIH", 0x06054B50, 0, 0, len(entries), len(entries), len(central), len(out), 0)
    return out + central + end


def main():
    os.makedirs(CORRUPT, exist_ok=True)
    write(os.path.join(ROOT, "archive.zip"), make_zip())
    write(os.path.join(ROOT, "archive.tar"), make_tar("w"))
    write(os.path.join(ROOT, "archive.tar.gz"), make_tar("w:gz"))
    gz = io.BytesIO()
    with gzip.GzipFile(filename="texto.txt", mode="wb", fileobj=gz, mtime=int(MTIME)) as g:
        g.write(read("text.txt"))
    write(os.path.join(ROOT, "text.txt.gz"), gz.getvalue())
    # Old Windows tools: no UTF-8 flag, names in code page 437 ("año.txt" has ñ = 0xA4).
    write(os.path.join(ROOT, "legacy-cp437.zip"), stored_zip([(b"a\xa4o.txt", b"cp437\n")]))

    # Zip slip: every name tries to escape the extraction folder.
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for name in ["../../evil.txt", "/etc/evil-abs.txt", "C:\\Windows\\evil-win.txt", "ok/../../../evil-mid.txt", "..\\..\\evil-back.txt"]:
            z.writestr(zipfile.ZipInfo(name, DATE), b"evil")
        z.writestr(zipfile.ZipInfo("safe.txt", DATE), b"safe")
    write(os.path.join(CORRUPT, "zip-slip.zip"), buf.getvalue())

    # A symbolic link to /etc/passwd (Unix mode 0o120777 in the external attributes).
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        link = zipfile.ZipInfo("passwd-link", DATE)
        link.create_system, link.external_attr = 3, 0o120777 << 16
        z.writestr(link, "/etc/passwd")
        z.writestr(zipfile.ZipInfo("safe.txt", DATE), b"safe")
    write(os.path.join(CORRUPT, "symlink.zip"), buf.getvalue())

    # TAR with a symlink, a hard link, a FIFO, a device and a "../" file.
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w", format=tarfile.PAX_FORMAT) as t:
        for name, kind, target in [("sym", tarfile.SYMTYPE, "/etc/passwd"), ("hard", tarfile.LNKTYPE, "/etc/shadow"), ("fifo", tarfile.FIFOTYPE, ""), ("dev", tarfile.CHRTYPE, "")]:
            info = tarfile.TarInfo(name)
            info.type, info.linkname, info.mtime = kind, target, MTIME
            t.addfile(info)
        info = tarfile.TarInfo("../escape.txt")
        info.size, info.mtime = 4, MTIME
        t.addfile(info, io.BytesIO(b"evil"))
        info = tarfile.TarInfo("safe.txt")
        info.size, info.mtime = 4, MTIME
        t.addfile(info, io.BytesIO(b"safe"))
    write(os.path.join(CORRUPT, "links.tar"), buf.getvalue())

    # Zip bombs: 1 MB of zeros declared as 4 GB - 1 in the central directory (refused before inflating),
    # and the same data declared as 1 KB (the inflater must stop at the declared size).
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(zipfile.ZipInfo("zeros.bin", DATE), b"\0" * (1024 * 1024), compress_type=zipfile.ZIP_DEFLATED)
    data = bytearray(buf.getvalue())
    central = data.rfind(b"PK\x01\x02")
    bomb = bytearray(data)
    struct.pack_into("<I", bomb, central + 24, 0xFFFFFFFE)
    write(os.path.join(CORRUPT, "bomb-declared.zip"), bytes(bomb))
    lying = bytearray(data)
    struct.pack_into("<I", lying, central + 24, 1024)
    struct.pack_into("<I", lying, 22, 1024)
    write(os.path.join(CORRUPT, "lying-size.zip"), bytes(lying))

    # Password flag set (a real encrypted entry carries it; the content can't be read without the key).
    write(os.path.join(CORRUPT, "encrypted.zip"), stored_zip([(b"secret.txt", b"\x8a\x13" * 20)], flags=0x1))

    archive = make_zip()
    write(os.path.join(CORRUPT, "truncated.zip"), archive[: len(archive) // 2])
    targz = make_tar("w:gz")
    write(os.path.join(CORRUPT, "truncated.tar.gz"), targz[: len(targz) // 2])


main()
