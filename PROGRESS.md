# PROGRESS — Bitácora de FileFlip

## 2026-10-19 — Sesión 1 (primera ejecución)

**Qué se hizo**
- El repositorio estaba vacío. Se creó `main` con un README mínimo y la rama `dev` a partir de ella.
- Se creó PLAN.md con la especificación y las tareas por hitos (base + i18n → imágenes en navegador → PDF en navegador → documentos en servidor → cuentas/suscripción → publicidad → SEO cola larga → deploy).
- Se crearon `.env.example`, `docker-compose.yml` (MongoDB 7 + Gotenberg 8) y `.gitignore`.

**Decisiones**
- El repo en GitHub ya se llama `Juan-Aste/fileflip` (la sesión lo accede con el nombre antiguo `image-saas`, que redirige).
- Estructura prevista: `src/` con App Router en `src/app/[locale]/`, mensajes en `messages/`.

**Problemas**
- **No se pudo hacer el scaffolding (tarea 0.3)**: en este entorno de ejecución el registro de npm (`registry.npmjs.org`) no resuelve DNS y el proxy de salida lo rechaza (403). Sin acceso a npm no se puede ejecutar `create-next-app` ni instalar dependencias, ni verificar `npm run lint`/`npm run build`. Para no subir código sin verificar, solo se subieron documentos y configuración.

**Qué sigue**
- Tarea 0.3: scaffolding con create-next-app (cuando haya acceso a npm), luego 0.4 y 0.5.

## 2026-10-19 — Sesión 2 (tarea 0.3)

**Qué se hizo**
- Scaffolding de Next.js escrito a mano replicando la salida de create-next-app: `package.json` (Next 15.5.4, React 19.1, Tailwind 4, ESLint 9 con `eslint-config-next`, TypeScript 5.9), `tsconfig.json` con alias `@/*`, `next.config.ts` con `output: "standalone"`, `postcss.config.mjs`, `eslint.config.mjs`, `src/app/{layout,page}.tsx` y `globals.css` provisorios.
- Workflow de GitHub Actions `.github/workflows/ci.yml` (push a dev/main, PR y manual): install → lint → test (si existe) → build, y sube el `package-lock.json` generado como artefacto.
- CI verde en el commit 155963f: lint y build pasan.

**Decisiones**
- El registro de npm sigue bloqueado en el entorno de la tarea programada (DNS no resuelve y el proxy de salida devuelve 403). En vez de bloquear el proyecto, **la verificación de lint/build/tests se hace en GitHub Actions**: se hace push a dev y se revisa el resultado del run con las herramientas de GitHub. No cambia el stack.
- `npm run lint` usa `eslint .` directamente (no `next lint`, que está deprecado).
- El layout raíz y la portada son provisorios; en el Hito 1 pasan a `app/[locale]/` con next-intl.
- Sin lockfile por ahora (no se puede generar localmente); se agregó la tarea 0.6 para commitearlo.

**Qué sigue**
- 0.4: estructura de carpetas y conexión Mongoose con caché (agregando `mongoose` al package.json).
- 0.5: Vitest.

**Problemas**
- Sin acceso local a npm no se puede ejecutar nada antes del push; cada sesión depende del CI para validar. Si el CI falla, hay que corregir o revertir en la misma sesión.

## Pendiente del dueño
- Habilitar el acceso a `registry.npmjs.org` para el entorno de la tarea programada (en claude.ai → Settings > Capabilities, dominios permitidos / gestores de paquetes). Mientras tanto se valida todo con GitHub Actions, que es más lento y no permite probar antes del push.
- Crear credenciales de Google OAuth (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`).
- Configurar un proveedor SMTP para magic links (`EMAIL_SERVER`, `EMAIL_FROM`).
- Crear cuenta de Mercado Pago y obtener credenciales de prueba (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`).
- Elegir proveedor de pagos internacional (por ejemplo Lemon Squeezy o Paddle) para usuarios fuera de los países de Mercado Pago.
- Cuenta de Google AdSense (`NEXT_PUBLIC_ADSENSE_CLIENT`).
- Proyecto en Railway y base MongoDB (Railway o Atlas).
