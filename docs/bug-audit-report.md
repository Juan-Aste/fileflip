# Informe de la auditoría de bugs (fase 6)

Fecha: 2026-10-23. Rama: `dev`. Detalle de cada hallazgo (pasos para reproducir, navegador, commit): [`docs/bug-audit.md`](bug-audit.md).

## Resumen

La fase 6 buscó, antes que los usuarios, bugs del tipo de los que el dueño encontró en producción: una capa decorativa invisible que tapaba botones y un login por email que fallaba sin mostrar nada (Railway bloquea SMTP). Para cada clase de bug primero se construyó un detector automático, se corrió, y cada arreglo quedó con un test de regresión.

**25 hallazgos**: 22 arreglados, 1 abierto, 1 descartado (fallo del motor de pruebas, no del código) y 1 que depende de la configuración del dueño. Ninguno fue crítico.

| Gravedad | Encontrados | Arreglados | Quedan |
|----------|-------------|------------|--------|
| Crítica | 0 | 0 | — |
| Alta | 6 | 5 | B-22 (configuración del dueño) |
| Media | 12 | 11 | B-06 (abierto, intermitente) |
| Baja | 7 | 6 | B-04 (descartado: motor WebKit de Linux) |
| **Total** | **25** | **22** | **3** |

**Importante**: producción (`main`) sigue en la fase 4. `dev` lleva 51 commits más con los arreglos de las fases 5 y 6, incluidos los dos bugs que vio el dueño (la capa del hero y el login por email con Resend). Nada de esto llega a los usuarios hasta mergear `dev` en `main`.

## Qué se revisó

| Hito | Alcance | Detector que quedó |
|------|---------|--------------------|
| 6A | Clicabilidad de 216 páginas (portada en 5 idiomas, catálogo, categorías, herramientas, conversiones, cola larga, precios, login, cuenta, admin, legales, créditos) en 1280×800, 768×1024 y 390×844, claro y oscuro: `elementFromPoint` en el centro y las esquinas de cada control, fuera de pantalla y objetivos táctiles < 24 px. Estados abiertos (menú móvil, Ctrl+K, idioma, acordeones, resultados). Revisión del código de capas `absolute`/`fixed` | `clickable.spec.ts`, `open-states.spec.ts`, `decorative-layers.test.ts` |
| 6B | Una herramienta por familia (imagen, PDF, documentos, datos, OCR, comprimidos, ebooks, audio, video, 3D, CAD, utilidades) en Firefox, WebKit, iPhone (WebKit) y Android (Chromium); navegador sin Worker, WebAssembly, OffscreenCanvas o WebCodecs | proyectos `firefox`, `webkit`, `iphone`, `android` (tests `@xb`), `early-pick.spec.ts`, `unsupported.spec.ts` |
| 6C | Herramientas, login, checkout, cancelación, admin, CSV, buscador e idioma con respuestas lentas, 4xx/5xx, páginas del proxy, timeouts, sin conexión, despliegue nuevo y doble clic | `failure-states.spec.ts`, `billing-states.spec.ts`, `search-locale-states.spec.ts`, `login.spec.ts` |
| 6D | Cada variable de `.env.example` ausente o vacía; la app con `next start` sin variables, con MongoDB caído y recuperado, y Gotenberg colgado; cabeceras de país e idioma; prueba de humo de solo lectura en producción | `environments.spec.ts`, `scripts/smoke-production.mjs` |
| 6E | Fotos de 12–48 MP con orientación EXIF, PNG de 33 MB, PDF de 500 páginas, escaneado, con contraseña y con permisos, nombres con acentos, emojis y muy largos, archivos de 0 bytes, extensiones que mienten, cerca y por encima del límite | `scripts/fixtures/edge.mjs`, `edge-files.spec.ts`, `edge-files-families.spec.ts` |
| 6F | Cabeceras HTTP, cookies de sesión, acceso a admin, facturación y webhook de Mercado Pago, tamaño de los cuerpos (también sin `Content-Length`), errores sin datos internos, límites de frecuencia | `security-headers.spec.ts`, `access-control.spec.ts`, `api-limits.spec.ts`, `rate-limits.spec.ts` |

Resultados sin hallazgos que vale la pena destacar: ningún control tapado, fuera de pantalla ni con objetivo táctil chico en las 216 páginas × 6 combinaciones (el arreglo de la capa del hero de la fase 5 se mantiene); ninguna herramienta se colgó ni falló en silencio sin las APIs modernas; indicador de trabajo, bloqueo del doble envío, `aria-live`, reintento y cancelar ya funcionaban en las herramientas; el buscador ya manejaba bien sus errores; las cookies de sesión ya eran `HttpOnly; Secure; SameSite=Lax` detrás del HTTPS de Railway; el admin y las APIs protegidas ya rechazaban accesos sin permiso o firma.

## Bugs por categoría

### Entorno y configuración (local ≠ producción)
| ID | Gravedad | Qué pasaba | Commit |
|----|----------|------------|--------|
| B-15 | alta | `NEXT_PUBLIC_SITE_URL` vacía o sin `https://` → 500 en todas las páginas | 697c531 |
| B-16 | alta | Si MongoDB no respondía al arrancar, nadie podía iniciar sesión hasta reiniciar la app (aunque MongoDB volviera) | e07b326 |
| B-01 | media | Sin `MONGODB_URI` y con email habilitado → 500 en todo Auth.js (tampoco Google) | 697c531 |
| B-14 | media | Sin `AUTH_SECRET` → 500 en `/api/auth/session` en cada visita | 697c531 |

### Seguridad
| ID | Gravedad | Qué pasaba | Commit |
|----|----------|------------|--------|
| B-23 | alta | Un `POST` en partes (sin `Content-Length`) enorme se guardaba entero en memoria: unos pocos pedidos tiraban el servicio | e95727c |
| B-22 | alta (solo si la variable está) | Con `PAYMENTS_MOCK=true` en producción, cualquiera fuera de los países con Mercado Pago pasa a Pro sin pagar | dueño |
| B-17 | media | Ninguna cabecera de seguridad (el sitio se podía embeber en otro: clickjacking) | a738689 |
| B-24 | media | El límite por IP se esquivaba con un `X-Forwarded-For` inventado | c81fe2b |
| B-25 | media | Sin límite para pedir enlaces de inicio de sesión (spam a cualquier casilla, cuota de Resend) | c81fe2b |

### Estados y mensajes de error
| ID | Gravedad | Qué pasaba | Commit |
|----|----------|------------|--------|
| B-10 | alta | Sin conexión o con una pestaña abierta durante un despliegue, las herramientas decían "No se pudo convertir este archivo." | 20bee6b |
| B-09 | media | Las páginas de error del proxy de Railway (413, 502–504) se mostraban como archivo inválido | 20bee6b |
| B-11 | media | "Pasar a Pro" y "Cancelar suscripción" sin indicador, sin tiempo límite (quedaban deshabilitados para siempre) | ed97622 |
| B-13 | media | El selector de idioma dejaba de funcionar sin conexión o tras un despliegue | 0c70dc1 |
| B-07 | media | Navegador sin Worker/WebAssembly/OffscreenCanvas: mensaje genérico en vez de "tu navegador no puede" | f971cb6 |
| B-08 | baja | Audio y video sin WebCodecs culpaban al archivo o al formato | f971cb6 |
| B-12 | baja | "Exportar CSV" del admin con MongoDB caído descargaba un JSON de error sin aviso | e07b326 |

### Archivos reales y casos límite
| ID | Gravedad | Qué pasaba | Commit |
|----|----------|------------|--------|
| B-18 | alta | Un PDF cifrado (con contraseña o solo con permisos, como muchos extractos bancarios) salía con las páginas **en blanco** sin aviso | 5ab4537 |
| B-19 | baja | Un `.pdf` de 0 bytes decía "Solo PDF" | 5ab4537 |
| B-20 | baja | Archivos de 0 bytes aceptados y errores engañosos al convertir | 3edd510 |
| B-21 | baja | Un PDF llamado `.docx` descargaba `informe.docx-jpg.zip` | 3edd510 |

### Otros navegadores
| ID | Gravedad | Qué pasaba | Commit |
|----|----------|------------|--------|
| B-05 | media | Un archivo elegido antes de que cargara el JavaScript (celulares lentos) se ignoraba en silencio | 28ea427 |
| B-03 | media | MP3 → FLAC en WebKit decía "archivo dañado" | 52dbd3b |
| B-06 | media | "Descargar todo (ZIP)" a veces no inicia la descarga (Firefox e iPhone emulado, solo en pruebas en paralelo) | abierto |
| B-04 | baja | Las páginas de video cuelgan el WebKit de Playwright en Linux | descartado |

### Clicabilidad
| ID | Gravedad | Qué pasaba | Commit |
|----|----------|------------|--------|
| B-02 | baja | Barra decorativa del panel de admin sin `pointer-events-none` (mismo patrón que la capa del hero) | b5df792 |

## Lo que queda y por qué

- **B-06 (media, abierto)**: "Descargar todo" no produjo descarga en algunas corridas del CI (Firefox con varios workers y una vez en iPhone emulado). En aislado pasa siempre, no hay errores en la consola y una descarga de `blob:` tardía funciona en Firefox, así que no se encontró la causa: puede ser del entorno de pruebas o un fallo real intermitente. Los proyectos de Firefox y WebKit tienen 1 reintento en el CI, que lo deja como "flaky" sin poner el job en rojo. Conviene que el dueño pruebe "Descargar todo" a mano en Firefox y Safari reales; si falla, abrir un ticket con el navegador y la herramienta.
- **B-04 (baja, descartado)**: `VideoEncoder.isConfigSupported` cierra el renderizador del WebKit de Playwright en Linux (GStreamer). Safari usa otros códecs (VideoToolbox) y no se pudo probar; un cuelgue del proceso no se puede detectar desde la página. Los tests de video quedan `fixme` en WebKit e iPhone. Revisar en un Safari real si es posible.
- **B-22**: es el modo demo documentado, no un fallo del código; depende de la configuración de Railway (abajo).
- **Observación sin cambio**: las subidas al servidor no tienen un tiempo límite propio; dependen del límite del trabajo y del botón Cancelar, que funciona.

## Lo que el dueño tiene que decidir o configurar

1. **Mergear `dev` en `main`** (51 commits atrás: fases 5 y 6, incluidos los dos bugs que vio en producción).
2. **Resend** para el login por email (pasos en PROGRESS.md, "Pendiente del dueño"): `RESEND_API_KEY`, dominio verificado, `EMAIL_FROM`, y borrar `EMAIL_SERVER`.
3. **Variables en Railway**: confirmar `AUTH_SECRET` y `NEXT_PUBLIC_SITE_URL` (con `https://`) en el servicio `app`.
4. **`PAYMENTS_MOCK` (B-22)**: confirmar que **no** esté definida en producción.
5. **Cloudflare**: si se pone delante de Railway, avisar para que `clientIp()` lea `CF-Connecting-IP` (si no, todos compartirían el límite por IP).
6. **Límite de conversiones con sesión**: hoy 100 por minuto por cuenta (5 × `RATE_LIMIT_PER_MINUTE`); cambiarlo si se prefiere otro valor.
7. **CSP**: hoy limitada a `frame-ancestors`, `object-src`, `base-uri` y `form-action`. Una CSP estricta con nonce rompería la caché estática y empeoraría Lighthouse, y AdSense carga desde dominios que cambian; si se quiere más, hay que decidir el equilibrio.
8. Después del merge, verificar en producción con `node scripts/smoke-production.mjs` (solo lectura, ~12 pedidos) que aparezcan las cabeceras de seguridad (B-17).

## Recomendaciones para que no vuelvan

Los detectores quedaron en el CI (`.github/workflows/ci.yml`):

- **Job `check`** (cada push): `decorative-layers.test.ts` falla si una capa `aria-hidden` con `absolute`/`fixed` no tiene `pointer-events-none`; los tests unitarios nuevos de `post-action`, `server-client`, límites del cuerpo e IP.
- **Job `e2e-browsers`** (cada push): muestra por familia en Firefox, WebKit, iPhone y Android; y en Chromium `open-states`, `login`, el control de `clickable`, `unsupported`, `failure-states`, `billing-states`, `search-locale-states`, `environments`, `edge-files*`, `security-headers`, `access-control`, `api-limits` y `rate-limits`.
- **Fuera del CI, para correr a mano**: `clickable.spec.ts` completo (216 páginas × 6 combinaciones, ~10 min) antes de cambios de diseño o de layout, y `scripts/smoke-production.mjs` después de cada despliegue.

Reglas prácticas:
- Toda capa decorativa encima de contenido lleva `pointer-events-none` (lo exige el CI).
- Toda acción nueva que llame a una API usa `postAction()` o `server-client.ts`: indicador, tiempo límite, error traducido en `aria-live` y reintento vienen incluidos.
- Toda variable de entorno nueva se agrega a `.env.example` y a `environments.spec.ts` con un caso "falta o vacía": debe degradar, nunca dar 500.
- Toda API nueva que reciba cuerpo usa el lector con límite (también sin `Content-Length`) y `clientIp()` para sus límites.
- Probar a mano en un Safari y un Firefox reales lo que la emulación no cubre (B-04, B-06, memoria y CPU de un celular).
