# Análisis del bundle del cliente (tarea 2A.3)

Generado con `npm run analyze` (`@next/bundle-analyzer`; los informes interactivos quedan en `.next/analyze/client.html`, `nodejs.html` y `edge.html`, no versionados). Tamaños en kB comprimidos con gzip.

## JS compartido por todas las páginas (~103 kB)

| Chunk | gzip | Contenido |
|---|---|---|
| `4bd1b696-*` | 53 kB | `react-dom` (cliente) |
| `1255-*` | 46 kB | runtime de Next (router de App Router, RSC client, React) |
| `webpack-*`, `main-app-*` | 3 kB | runtime de webpack |

No se puede reducir sin cambiar de framework; es el piso de cualquier página de Next 15.

## JS del layout (todas las páginas)

| Módulo | gzip | Comentario |
|---|---|---|
| `3809-*`: `@formatjs/icu-messageformat-parser`, `intl-messageformat`, `use-intl` | 12 kB | next-intl analiza los mensajes ICU en el navegador. La precompilación de mensajes de next-intl (`experimental.messages.precompile`) requiere Next 16; queda fuera de la fase 2. |
| `layout-*`: `LocaleSwitcher` + `src/content/longtail.ts` + `conversion-pages.ts` + `tools.ts` + `formats.ts` | 9 kB (≈6 kB de datos) | El selector de idioma traduce el slug en el cliente y por eso arrastra **todo el contenido de las páginas de cola larga** y los registros de conversiones/herramientas a todas las páginas. **Se puede calcular en el servidor** (2A.4). |
| `4707-*`: `Link` de Next/next-intl | 5 kB | necesario |

## JS de la portada y de las conversiones

| Módulo | gzip | Comentario |
|---|---|---|
| `4169-*`: `Converter`, `ImageOptionsPanel`, `FileRow`, `Dropzone`, `useFileQueue`, `formats.ts`, `detect.ts`, `image/client.ts`, `AdSlot` + `next/script` | 12 kB | El panel de opciones, las filas de resultado y el anuncio no se ven hasta que hay archivos: candidatos a import dinámico (2A.4). |

## JS de `[slug]` (herramientas, conversiones y cola larga)

| Módulo | gzip | Comentario |
|---|---|---|
| `ToolComponent` + las **6 herramientas PDF** (Organize, ImagesToPdf, Split, Rotate, Compress, Merge) + `pdf/client.ts` + `pdf/render.ts` | ≈7 kB | Cada página de herramienta carga las 6 y las de conversión de imágenes también, aunque no usan ninguna. Import dinámico por herramienta (2A.4). |

## Lo que ya está bien

- pdf.js (~1,2 MB), libheif (~2 MB), los códecs WASM de @jsquash, pdf-lib, fflate, gifenc y utif2 **no aparecen en ningún chunk inicial**: se descargan con `import()` dentro de los workers o al usarlos.
- Ninguna librería de servidor (sharp, mongoose, docx, nodemailer, next-auth) entra al bundle del cliente.

## Acciones (2A.4)

1. `LocaleSwitcher`: recibir los enlaces ya traducidos desde el servidor en vez de importar los registros de slugs.
2. `ToolComponent`: `next/dynamic` por herramienta.
3. `Converter`: cargar de forma diferida el panel de opciones y lo que solo aparece con resultados.
