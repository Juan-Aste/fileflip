# Fixtures

Archivos de ejemplo pequeños (< 200 KB cada uno) para los tests y la auditoría. Todo es sintético: degradados, formas y texto de relleno propio; sin contenido de terceros ni datos personales.

Se regeneran con `node scripts/fixtures/generate.mjs` (los de oficina necesitan LibreOffice instalado; si no está, se conservan los del repo). `tests/fixtures.test.ts` comprueba que cada archivo se detecta con su formato, que las imágenes miden 160×120, las páginas de los PDF y que los corruptos fallan.

| Archivo | Origen |
|---|---|
| `image.{png,jpg,webp,avif,gif,tiff}` | sharp desde una imagen RGBA de 160×120 (degradado, disco mandarina y esquina transparente; JPG con fondo blanco) |
| `image.bmp` | Codificador BMP de 24 bits del script (transparencia sobre blanco) |
| `image.ico` | Contenedor ICO del script con PNG de 32 y 64 px |
| `image.svg` | SVG escrito a mano (160×120) |
| `photo.heic` | HEIC de 120×80 hecho con pillow-heif (fase 1; sharp no codifica HEIC) |
| `document.pdf`, `document-1page.pdf`, `document-images.pdf` | pdf-lib: 3 páginas de texto, 1 página, y 2 páginas con una foto JPG de 640×480 (para comprimir) |
| `scan.pdf` | pdf-lib: una página A4 que solo tiene la imagen de 320×240 (sin capa de texto), como un escaneo |
| `text.txt`, `table.csv` | UTF-8 con acentos y chino / CSV con una coma entre comillas |
| `data.json` | 3 registros con objetos y listas anidados, comillas, `null`, salto de línea, chino y un código postal "007" |
| `config.yaml`, `config.toml` | YAML con comentario, ancla + clave de combinación (`<<`), `"007"` entre comillas y dos documentos / TOML con tabla, fecha y lista de tablas |
| `catalog.xml` | XML con comentario, atributos, elementos repetidos, entidades predefinidas y numéricas (chino) y CDATA |
| `qr.png`, `qr-photo.jpg`, `qr-inverted.png` | qrcode + sharp: QR de un enlace (300 px, limpio) / QR de una red Wi-Fi ficticia girado 12° sobre un fondo con luz despareja y ruido, desenfocado y en JPEG al 70 % / QR claro sobre fondo oscuro con texto UTF-8 |
| `photo.jpg`, `photo-alpha.png`, `noise.jpg` | sharp: paisaje sintético de 1000×750 con ruido en JPEG al 95 % (para comprimir) / degradado de 360×270 con fondo transparente (círculo opaco) en PNG / grano fuerte de 480×360 en JPEG al 85 % (para llegar a un peso chico hay que achicarlo) |
| `exif-gps.jpg`, `exif-gps.png`, `exif-gps.webp` | sharp: el paisaje a 320×240 con metadatos inventados (cámara "Fileflect Test Cam 1", fecha, autor, programa y GPS en el Río de la Plata); el JPG guardado de costado con orientación EXIF 6 |
| `photo.heif` | `generate.mjs`: los mismos bytes que `photo.heic` con la marca principal del `ftyp` cambiada a `mif1` (contenedor HEIF genérico, como lo escriben cámaras que no son iPhone) |
| `subtitles.{srt,vtt,ass,ssa}`, `subtitles-latin1.srt` | `generate.mjs`: líneas propias con cursiva, negrita, un color, acentos, chino y `&`; el VTT con `NOTE`, `STYLE`, id, ajustes de posición y voz; ASS/SSA con un segundo estilo, un `Comment:` y etiquetas `{\pos}`/`{\c}` / SRT en Windows-1252 con CRLF |
| `font.ttf`, `font.otf`, `font.woff`, `font.woff2` | `scripts/fixtures/fonts.mjs`: fuente propia "Fileflect Test" (6 glifos poligonales: .notdef, espacio, A, B, a, ñ). TTF escrito por el script (tablas glyf/loca); OTF con contornos CFF de opentype.js (su fecha de modificación cambia en cada ejecución); WOFF 1.0 con el escritor zlib del script; WOFF2 del OTF con el codificador de referencia de Google (woff2-encoder) |
| `document.md`, `page.html` | `generate.mjs`: Markdown con tabla GFM, lista de tareas, código, enlace, y un `<script>`, un `onerror` y un enlace `javascript:` que no deben sobrevivir / HTML con título en chino, lista, tabla, código, enlace, imagen remota con `onerror`, `<style>`, `<script>` y un formulario |
| `table-excel.csv`, `table.tsv` | CSV como lo guarda Excel en español (punto y coma, coma decimal, Windows-1252) / TSV en UTF-8 |
| `document.{odt,docx,doc,rtf}` | LibreOffice desde un documento ODF plano escrito en el script |
| `spreadsheet.{ods,xlsx,xls}` | LibreOffice desde una hoja ODF plana (4 filas × 3 columnas) |
| `workbook.{ods,xlsx}` | LibreOffice desde una hoja ODF plana del script: hojas "Ventas" (fórmulas `B2*C2` y `SUM`, fechas con formato ISO, código "007" como texto, acentos y chino) y "Notas" |
| `slides.{odp,pptx}` | LibreOffice desde una presentación ODF plana de 2 diapositivas (el PPT ocupa ~450 KB y no se incluye: `tests/inventory/server.test.ts` lo genera desde `slides.pptx` con LibreOffice al correr) |
| `corrupt/truncated.{jpg,png,pdf}` | Los archivos válidos cortados a la mitad (PDF: un tercio) |
| `corrupt/garbage.{png,pdf}` | Firma válida seguida de bytes basura |
| `corrupt/text-as.jpg`, `corrupt/random-as.docx` | Contenido que no coincide con la extensión |
| `corrupt/empty.png` | Archivo vacío |
| `corrupt/broken.json`, `corrupt/bad-quotes.csv` | JSON cortado / CSV con una comilla sin cerrar |
| `corrupt/xxe.xml`, `corrupt/broken.xml` | Entidad externa que apunta a `/etc/passwd` (XXE) / etiquetas mal cerradas |
| `corrupt/alias-bomb.yaml`, `corrupt/broken.toml` | "Billion laughs": 9 niveles de 9 alias (se expandiría a ~387 millones de valores) / TOML con texto y tabla sin cerrar |
| `corrupt/truncated.woff2`, `corrupt/bomb.woff` | `fonts.mjs`: el WOFF2 cortado a la mitad / un WOFF cuya primera tabla declara inflarse a 1 GB (bomba) |
| `corrupt/broken.srt` | Bloques sin ninguna línea de tiempos válida |
| `archive.{zip,tar,tar.gz}`, `text.txt.gz`, `legacy-cp437.zip` | `scripts/fixtures/archives.py` con `zipfile`, `tarfile` y `gzip` de Python (independientes de fflate): el mismo árbol con carpetas, nombres UTF-8 (ñ, —, chino), una carpeta vacía, un archivo vacío, `image.png` y `document-1page.pdf`; los TAR en formato PAX con un nombre de más de 255 caracteres; el GZ guarda el nombre `texto.txt`; ZIP escrito a mano sin la marca UTF-8 con un nombre en la página de códigos 437 (`año.txt`). El `.tar.gz` cambia en cada ejecución (fecha del encabezado gzip) |
| `corrupt/zip-slip.zip`, `corrupt/symlink.zip`, `corrupt/links.tar` | `archives.py`: nombres que intentan salir de la carpeta (`../../`, `/etc/`, `C:\`, `ok/../../../`, `..\..\`) / enlace simbólico a `/etc/passwd` / TAR con enlace simbólico, enlace duro, FIFO, dispositivo y `../escape.txt` |
| `corrupt/bomb-declared.zip`, `corrupt/lying-size.zip`, `corrupt/encrypted.zip`, `corrupt/truncated.{zip,tar.gz}` | `archives.py`: 1 MB de ceros que el directorio central declara como 4 GB / los mismos datos declarados como 1 KB / entrada con la marca de cifrado / el ZIP y el TAR.GZ válidos cortados a la mitad |
| `archive.7z`, `corrupt/encrypted.7z`, `corrupt/encrypted-header.7z`, `corrupt/truncated.7z` | `scripts/fixtures/archives_7z_rar.py` con **py7zr** 0.22 (LGPL-2.1, solo para generarlos): el mismo árbol que `archive.zip` en LZMA2 / datos cifrados con contraseña / cabecera cifrada / cortado a la mitad |
| `archive-rar4.rar`, `archive-rar5.rar`, `archive-rar5-unicode.rar`, `corrupt/encrypted.rar`, `corrupt/truncated.rar` | No existe un escritor RAR libre: son archivos de prueba del propio **libarchive** (BSD-2-Clause, etiqueta v3.7.7: `test_read_format_rar`, `_rar5_win32`, `_rar5_unicode`, `_rar5_encrypted`), descargados y decodificados por `archives_7z_rar.py`. RAR 4 con un enlace simbólico / RAR 5 comprimido cuyos datos siguen el patrón `verify_data` de libarchive / nombres con emoji, enlace duro y simbólico / entradas cifradas / el RAR 5 cortado a la mitad |
| `ocr-es.png`, `ocr-es.tiff`, `ocr-en.jpg`, `ocr-zh.png`, `ocr-blank.png` | `scripts/fixtures/ocr.mjs` con sharp: frases propias renderizadas (texto esperado conocido) — español con acentos, ñ, ¿? y números (PNG y TIFF de 1 bit CCITT G4, como un escáner) / inglés como foto de celular (fondo gris, girado 2,5°, ruido, desenfoque y JPEG al 80 %) / chino simplificado (fuente WenQuanYi Zen Hei al generarlo) / imagen sin texto |
| `scan-text.pdf` | `scripts/fixtures/ocr.mjs` con pdf-lib: PDF "escaneado" A4 de 3 páginas — 1) la página en español como imagen, 2) la foto inglesa en una página con `/Rotate 90` (dibujada girada para que se lea derecha), 3) texto digital real (Helvetica) que el OCR no debe tocar |
