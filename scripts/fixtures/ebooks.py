"""EPUB fixtures for the ebook tools, written with Python's own zipfile (independent
of the fflate reader they test): `python3 -I scripts/fixtures/ebooks.py`.

Valid: book.epub (EPUB 3: nav, 2 chapters in spine order, a PNG, an SVG cover page,
links between chapters, self-closing XHTML tags, a script, an event handler and a
remote image that must not survive) and book-epub2.epub (EPUB 2 with an NCX, a
UTF-16 chapter and a path with spaces).
Hostile (corrupt/): ebook-drm.epub (encrypted chapter), ebook-truncated.epub,
ebook-no-container.epub, ebook-entities.epub (OPF declaring entities).
"""
import os
import struct
import zipfile
import zlib

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tests", "fixtures")
CORRUPT = os.path.join(ROOT, "corrupt")
DATE = (2024, 5, 17, 12, 30, 0)


def png(width, height, rgb):
    """A solid-color RGB PNG."""
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    row = b"\x00" + bytes(rgb) * width
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(row * height))
        + chunk(b"IEND", b"")
    )


CONTAINER = b"""<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
"""


def epub(path, files, mimetype=b"application/epub+zip"):
    with zipfile.ZipFile(path, "w") as z:
        # The mimetype entry goes first and uncompressed (OCF).
        z.writestr(zipfile.ZipInfo("mimetype", DATE), mimetype, compress_type=zipfile.ZIP_STORED)
        for name, data in files:
            z.writestr(zipfile.ZipInfo(name, DATE), data, compress_type=zipfile.ZIP_DEFLATED)


OPF3 = """<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:7f1c2a60-0000-4000-8000-000000000001</dc:identifier>
    <dc:title>El viaje de prueba</dc:title>
    <dc:creator>Ana Ejemplo</dc:creator>
    <dc:creator>Luis Muestra</dc:creator>
    <dc:language>es</dc:language>
    <meta property="dcterms:modified">2024-05-17T12:30:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="cover" href="Text/cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch1" href="Text/chapter%201.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="Text/ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="css" href="Styles/book.css" media-type="text/css"/>
    <item id="img" href="Images/red.png" media-type="image/png"/>
    <item id="coverimg" href="Images/cover.png" media-type="image/png" properties="cover-image"/>
  </manifest>
  <spine>
    <itemref idref="cover"/>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>
"""

NAV = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Índice</title></head>
<body><nav epub:type="toc"><ol><li><a href="Text/chapter%201.xhtml">Uno</a></li><li><a href="Text/ch2.xhtml">Dos</a></li></ol></nav></body>
</html>
"""

COVER = """<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:xlink="http://www.w3.org/1999/xlink">
<head><title>Portada</title></head>
<body><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 40"><image width="30" height="40" xlink:href="../Images/cover.png"/></svg></body>
</html>
"""

CHAPTER1 = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Capítulo 1</title><link rel="stylesheet" href="../Styles/book.css"/><script>window.pwned = 1</script></head>
<body>
<a id="top"/>
<h1 id="start">Capítulo 1: La partida</h1>
<p>Era una mañana de otoño en el año 1999; la niña llevaba <em>una mochila</em> y un mapa.</p>
<p class="note" onclick="window.pwned = 2">Sigue en el <a href="ch2.xhtml#llegada">capítulo dos</a> o visita <a href="https://example.com/">la web</a>.</p>
<p>Un enlace peligroso: <a href="javascript:window.pwned=3">no</a>.<br/>Segunda línea.</p>
<p><img src="../Images/red.png" alt="Cuadro rojo"/></p>
<p><img src="https://example.com/tracker.png" alt="Imagen remota"/></p>
<ul><li>Primero</li><li>Segundo</li></ul>
<script>window.pwned = 4</script>
</body>
</html>
"""

CHAPTER2 = """<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Capítulo 2</title></head>
<body>
<h1>Capítulo 2</h1>
<h2 id="llegada">La llegada</h2>
<p>Al final del camino había una casa con 3 ventanas.</p>
<table><tr><th>Día</th><th>Kilómetros</th></tr><tr><td>Lunes</td><td>12</td></tr></table>
<p><a href="chapter%201.xhtml#start">Volver al inicio</a></p>
</body>
</html>
"""

OPF2 = """<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>A Test Journey</dc:title>
    <dc:creator opf:role="aut">Sam Sample</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="uid">test-epub2-0001</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="a" href="part one.html" media-type="application/xhtml+xml"/>
    <item id="b" href="sub/two.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx"><itemref idref="a"/><itemref idref="b" linear="no"/></spine>
</package>
"""

NCX = """<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><navMap/></ncx>
"""

PART1 = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>One</title></head>
<body><h1>Part one</h1><p>The quick brown fox&#160;jumps over the lazy dog.</p><p>Caf&#233; and na&#239;ve.</p></body></html>
"""

PART2 = """<?xml version="1.0" encoding="UTF-16"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Two</title></head>
<body><h1>Part two</h1><p>Written in UTF-16: 東京 and Zürich.</p></body></html>
"""


def main():
    os.makedirs(CORRUPT, exist_ok=True)
    book = [
        ("META-INF/container.xml", CONTAINER),
        ("OEBPS/content.opf", OPF3.encode()),
        ("OEBPS/nav.xhtml", NAV.encode()),
        ("OEBPS/Text/cover.xhtml", COVER.encode()),
        ("OEBPS/Text/chapter 1.xhtml", CHAPTER1.encode()),
        ("OEBPS/Text/ch2.xhtml", CHAPTER2.encode()),
        ("OEBPS/Styles/book.css", b"body { background: url(https://example.com/bg.png); color: red; }\n"),
        ("OEBPS/Images/red.png", png(8, 6, (220, 30, 30))),
        ("OEBPS/Images/cover.png", png(30, 40, (20, 60, 160))),
    ]
    epub(os.path.join(ROOT, "book.epub"), book)

    epub(
        os.path.join(ROOT, "book-epub2.epub"),
        [
            ("META-INF/container.xml", CONTAINER),
            ("OEBPS/content.opf", OPF2.encode()),
            ("OEBPS/toc.ncx", NCX.encode()),
            ("OEBPS/part one.html", PART1.encode()),
            ("OEBPS/sub/two.xhtml", PART2.encode("utf-16")),
        ],
    )

    # Adobe ADEPT style DRM: the chapters are listed in encryption.xml with AES.
    encryption = b"""<?xml version="1.0"?>
<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:enc="http://www.w3.org/2001/04/xmlenc#">
  <enc:EncryptedData><enc:EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"/>
    <enc:CipherData><enc:CipherReference URI="OEBPS/Text/ch2.xhtml"/></enc:CipherData></enc:EncryptedData>
</encryption>
"""
    epub(os.path.join(CORRUPT, "ebook-drm.epub"), book + [("META-INF/encryption.xml", encryption)])

    with open(os.path.join(ROOT, "book.epub"), "rb") as f:
        data = f.read()
    with open(os.path.join(CORRUPT, "ebook-truncated.epub"), "wb") as f:
        f.write(data[: len(data) // 2])

    epub(os.path.join(CORRUPT, "ebook-no-container.epub"), book[1:])

    entities = OPF3.replace(
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE package [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">]>',
    ).replace("El viaje de prueba", "&b;")
    epub(os.path.join(CORRUPT, "ebook-entities.epub"), [book[0], ("OEBPS/content.opf", entities.encode())] + book[2:])


if __name__ == "__main__":
    main()
