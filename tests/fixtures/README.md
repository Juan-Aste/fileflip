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
| `text.txt`, `table.csv` | UTF-8 con acentos y chino / CSV con una coma entre comillas |
| `data.json` | 3 registros con objetos y listas anidados, comillas, `null`, salto de línea, chino y un código postal "007" |
| `config.yaml`, `config.toml` | YAML con comentario, ancla + clave de combinación (`<<`), `"007"` entre comillas y dos documentos / TOML con tabla, fecha y lista de tablas |
| `catalog.xml` | XML con comentario, atributos, elementos repetidos, entidades predefinidas y numéricas (chino) y CDATA |
| `qr.png`, `qr-photo.jpg`, `qr-inverted.png` | qrcode + sharp: QR de un enlace (300 px, limpio) / QR de una red Wi-Fi ficticia girado 12° sobre un fondo con luz despareja y ruido, desenfocado y en JPEG al 70 % / QR claro sobre fondo oscuro con texto UTF-8 |
| `table-excel.csv`, `table.tsv` | CSV como lo guarda Excel en español (punto y coma, coma decimal, Windows-1252) / TSV en UTF-8 |
| `document.{odt,docx,doc,rtf}` | LibreOffice desde un documento ODF plano escrito en el script |
| `spreadsheet.{ods,xlsx,xls}` | LibreOffice desde una hoja ODF plana (4 filas × 3 columnas) |
| `slides.{odp,pptx}` | LibreOffice desde una presentación ODF plana de 2 diapositivas (el PPT ocupa ~450 KB y no se incluye) |
| `corrupt/truncated.{jpg,png,pdf}` | Los archivos válidos cortados a la mitad (PDF: un tercio) |
| `corrupt/garbage.{png,pdf}` | Firma válida seguida de bytes basura |
| `corrupt/text-as.jpg`, `corrupt/random-as.docx` | Contenido que no coincide con la extensión |
| `corrupt/empty.png` | Archivo vacío |
| `corrupt/broken.json`, `corrupt/bad-quotes.csv` | JSON cortado / CSV con una comilla sin cerrar |
| `corrupt/xxe.xml`, `corrupt/broken.xml` | Entidad externa que apunta a `/etc/passwd` (XXE) / etiquetas mal cerradas |
| `corrupt/alias-bomb.yaml`, `corrupt/broken.toml` | "Billion laughs": 9 niveles de 9 alias (se expandiría a ~387 millones de valores) / TOML con texto y tabla sin cerrar |
