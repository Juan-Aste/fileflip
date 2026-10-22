"""7Z and RAR fixtures for "Extract ZIP" (3C.30).

7Z files are written with py7zr (LGPL-2.1, only needed to regenerate them:
`python3 -m venv /tmp/v && /tmp/v/bin/pip install py7zr==0.22.0 &&
/tmp/v/bin/python scripts/fixtures/archives_7z_rar.py`).
There is no free RAR writer, so the RAR files are libarchive's own test files
(BSD-2-Clause, tag v3.7.7), downloaded as .uu and decoded here.
"""
import binascii
import io
import os
import urllib.request

import py7zr

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tests", "fixtures")
CORRUPT = os.path.join(ROOT, "corrupt")
LIBARCHIVE_TESTS = "https://raw.githubusercontent.com/libarchive/libarchive/v3.7.7/libarchive/test/"


def read(name):
    with open(os.path.join(ROOT, name), "rb") as f:
        return f.read()


def write(path, data):
    with open(path, "wb") as f:
        f.write(data)
    print(f"{os.path.relpath(path, ROOT)}: {len(data)} bytes")


TREE = [
    ("docs/readme.txt", "Léeme: archivo de prueba de Fileflect. ñandú 中文\n".encode() * 20),
    ("docs/año 2024/notas — 中文.txt", "Notas con acentos: canción, pingüino.\n".encode()),
    ("images/image.png", read("image.png")),
    ("document-1page.pdf", read("document-1page.pdf")),
    ("empty.txt", b""),
]


def seven_zip(entries, **options):
    buf = io.BytesIO()
    with py7zr.SevenZipFile(buf, "w", **options) as z:
        for name, data in entries:
            z.writef(io.BytesIO(data), name)
    return buf.getvalue()


def libarchive_test_file(name):
    text = urllib.request.urlopen(LIBARCHIVE_TESTS + name + ".uu").read().decode()
    out = bytearray()
    for line in text.splitlines()[1:]:
        if line.startswith("end") or line in ("`", ""):
            continue
        out += binascii.a2b_uu(line)
    return bytes(out)


def main():
    os.makedirs(CORRUPT, exist_ok=True)
    archive = seven_zip(TREE)
    write(os.path.join(ROOT, "archive.7z"), archive)
    secret = [("secreto.txt", b"datos privados\n" * 10)]
    write(os.path.join(CORRUPT, "encrypted.7z"), seven_zip(secret, password="clave", header_encryption=False))
    write(os.path.join(CORRUPT, "encrypted-header.7z"), seven_zip(secret, password="clave", header_encryption=True))
    write(os.path.join(CORRUPT, "truncated.7z"), archive[: len(archive) // 2])

    # RAR 4 with a symbolic link; RAR 5 compressed (contents follow libarchive's verify_data pattern);
    # RAR 5 with emoji names, a hard link and a symbolic link; RAR 5 with encrypted entries.
    write(os.path.join(ROOT, "archive-rar4.rar"), libarchive_test_file("test_read_format_rar.rar"))
    rar5 = libarchive_test_file("test_read_format_rar5_win32.rar")
    write(os.path.join(ROOT, "archive-rar5.rar"), rar5)
    write(os.path.join(ROOT, "archive-rar5-unicode.rar"), libarchive_test_file("test_read_format_rar5_unicode.rar"))
    write(os.path.join(CORRUPT, "encrypted.rar"), libarchive_test_file("test_read_format_rar5_encrypted.rar"))
    write(os.path.join(CORRUPT, "truncated.rar"), rar5[: len(rar5) // 2])


main()
