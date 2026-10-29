# Fileflect

[Español](#español) · [English](#english)

## Español

[Fileflect](https://fileflect.com) es un sitio de herramientas para archivos (convertir, comprimir, unir y editar imágenes, PDF, documentos, audio, video, fuentes, modelos 3D y más) que procesa en el navegador todo lo posible: los archivos no se suben. Sin marcas de agua y sin registro obligatorio. Disponible en español, inglés, portugués, francés y chino.

Hecho con Next.js 15, React 19, TypeScript, Tailwind CSS y next-intl. Lo que el navegador no puede hacer (oficina → PDF, PDF/A) corre en el servidor con [Gotenberg](https://gotenberg.dev) (LibreOffice). Las cuentas y sesiones usan MongoDB y Auth.js.

### Correrlo localmente

Necesitas Node.js 20.9 o posterior (el sitio usa 22) y, para las herramientas de servidor, Docker.

```bash
git clone https://github.com/Juan-Aste/fileflip.git
cd fileflip
npm ci
cp .env.example .env.local   # completa lo que necesites (ver abajo)
docker compose up -d         # MongoDB en :27017 y Gotenberg en :3001
npm run dev                  # http://localhost:3000
```

Sin Docker funcionan las herramientas que corren en el navegador; las de servidor y el inicio de sesión necesitan MongoDB y Gotenberg.

Comandos útiles:

| Comando | Qué hace |
|---|---|
| `npm run lint` · `npm run typecheck` | ESLint y TypeScript |
| `npm test` | tests unitarios (Vitest) |
| `npm run build` · `npm start` | build de producción y servidor |
| `npm run test:e2e` | tests de navegador (Playwright; ver `playwright.config.ts`) |
| `npm run licenses` | regenera los créditos y avisos de terceros después de cambiar dependencias |

### Variables de entorno

Todas están en [`.env.example`](.env.example) con comentarios, y la tabla completa en [`DEPLOY.md`](DEPLOY.md). Nunca se commitean valores reales. Las `NEXT_PUBLIC_*` se fijan al construir.

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio |
| `NEXT_PUBLIC_CONTACT_EMAIL` | correo de la página de contacto |
| `MONGODB_URI` | base de datos (cuentas, sesiones) |
| `GOTENBERG_URL`, `GOTENBERG_TIMEOUT_MS` | conversiones de oficina en el servidor |
| `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | inicio de sesión (Auth.js) |
| `RESEND_API_KEY` o `EMAIL_SERVER`, `EMAIL_FROM`, `AUTH_EMAIL_LOG_LINKS` | enlaces de acceso por correo |
| `PRO_ENABLED`, `MP_*`, `NEXT_PUBLIC_MP_PUBLIC_KEY`, `INTL_PAYMENT_*`, `PAYMENTS_MOCK` | plan Pro y pagos (apagado por defecto) |
| `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_SLOT_*` | anuncios (vacías = espacios reservados) |
| `NEXT_PUBLIC_MODELS_BASE_URL` | copia propia de los modelos de IA ([`docs/modelos-r2.md`](docs/modelos-r2.md)); vacía = Hugging Face |
| `NEXT_PUBLIC_SOURCE_URL` | enlace «Código fuente» en el footer y en créditos |
| `RATE_LIMIT_PER_MINUTE`, `TEMP_FILE_TTL_MINUTES` | límites del servidor |
| `ADMIN_EMAILS` | correos con acceso al panel de administración |

### Contribuir

- El desarrollo ocurre en la rama `dev`; `main` es lo que está en producción. Abre los pull requests contra `dev`.
- Antes de enviar cambios corre `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`, y los tests de navegador de las páginas que toques.
- Los textos de la interfaz van en `messages/` en los 5 idiomas.
- Una dependencia nueva debe tener una licencia compatible con la AGPL-3.0-or-later, anotarse en [`docs/dependencies.md`](docs/dependencies.md) y pasar `npm run licenses`.
- El plan de trabajo y el historial están en [`PLAN.md`](PLAN.md) y [`PROGRESS.md`](PROGRESS.md); la documentación técnica, en [`docs/`](docs/).
- Al contribuir aceptas que tu aporte se publique bajo la misma licencia.

### Licencia

El código de Fileflect es software libre bajo la [GNU Affero General Public License v3.0 o posterior](LICENSE) (AGPL-3.0-or-later). Si ofreces una versión modificada a otras personas a través de una red, la AGPL te obliga a ofrecerles su código fuente.

Las dependencias y modelos de terceros conservan sus propias licencias (ver la página de créditos del sitio, `public/third-party-notices.txt` y [`docs/licencia-agpl.md`](docs/licencia-agpl.md)). En particular, el modelo de voz Supertonic 3 se distribuye bajo BigScience OpenRAIL-M, con restricciones de uso.

**La marca «Fileflect», el nombre y el logo no se licencian bajo la AGPL.** Si publicas un fork, usa otro nombre y otro logo.

## English

[Fileflect](https://fileflect.com) is a file tools website (convert, compress, merge and edit images, PDFs, documents, audio, video, fonts, 3D models and more) that does as much as possible in the browser: your files are not uploaded. No watermarks and no sign-up required. Available in Spanish, English, Portuguese, French and Chinese.

Built with Next.js 15, React 19, TypeScript, Tailwind CSS and next-intl. What the browser can't do (office → PDF, PDF/A) runs on the server with [Gotenberg](https://gotenberg.dev) (LibreOffice). Accounts and sessions use MongoDB and Auth.js.

### Running it locally

You need Node.js 20.9 or later (the site uses 22) and, for the server-side tools, Docker.

```bash
git clone https://github.com/Juan-Aste/fileflip.git
cd fileflip
npm ci
cp .env.example .env.local   # fill in what you need (see below)
docker compose up -d         # MongoDB on :27017 and Gotenberg on :3001
npm run dev                  # http://localhost:3000
```

Without Docker the in-browser tools work; server-side tools and sign-in need MongoDB and Gotenberg.

| Command | What it does |
|---|---|
| `npm run lint` · `npm run typecheck` | ESLint and TypeScript |
| `npm test` | unit tests (Vitest) |
| `npm run build` · `npm start` | production build and server |
| `npm run test:e2e` | browser tests (Playwright; see `playwright.config.ts`) |
| `npm run licenses` | regenerates the credits and third-party notices after changing dependencies |

### Environment variables

They are all listed in [`.env.example`](.env.example) with comments (the variable table above applies; full details in [`DEPLOY.md`](DEPLOY.md), in Spanish). Never commit real values. `NEXT_PUBLIC_*` values are fixed at build time. `NEXT_PUBLIC_SOURCE_URL` shows a "Source code" link in the footer and on the credits page; `NEXT_PUBLIC_MODELS_BASE_URL` points the AI tools to our own copy of the models (empty = Hugging Face).

### Contributing

- Development happens on the `dev` branch; `main` is what runs in production. Open pull requests against `dev`.
- Before sending changes, run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`, plus the browser tests of the pages you touch.
- UI strings live in `messages/`, in all 5 languages.
- A new dependency must have a license compatible with AGPL-3.0-or-later, be listed in [`docs/dependencies.md`](docs/dependencies.md) and pass `npm run licenses`.
- Project docs (`PLAN.md`, `PROGRESS.md`, `docs/`) are written in Spanish.
- By contributing you agree that your contribution is published under the same license.

### License

Fileflect's code is free software under the [GNU Affero General Public License v3.0 or later](LICENSE) (AGPL-3.0-or-later). If you offer a modified version to other people over a network, the AGPL requires you to offer them its source code.

Third-party dependencies and models keep their own licenses (see the site's credits page, `public/third-party-notices.txt` and [`docs/licencia-agpl.md`](docs/licencia-agpl.md)). In particular, the Supertonic 3 voice model is distributed under BigScience OpenRAIL-M, which has use restrictions.

**The "Fileflect" trademark, name and logo are not licensed under the AGPL.** If you publish a fork, use a different name and logo.
