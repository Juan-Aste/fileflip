# Escaneo de secretos y datos personales antes de publicar el repo (fase 11.5a)

Hecho el 2026-10-29, sin reescribir el historial. **Resultado: no hay secretos reales en el historial; no hay que rotar ninguna clave por este motivo.**

## Herramientas

| Herramienta | Alcance | Resultado |
|---|---|---|
| gitleaks 8.28.0 (`gitleaks git --log-opts=--all`) | 242 commits de todas las ramas (`main`, `dev`, `claude/…`); el repo no tiene tags | **0 hallazgos** |
| trufflehog 3.90.8 (`trufflehog git file://. --no-verification`) | todo el historial, también dentro de archivos comprimidos | **0 secretos** (verificados o no) |
| gitleaks sobre la carpeta de trabajo (`gitleaks dir .`) | archivos actuales | 15 `generic-api-key`, todos en `.next/` (salida local del build, ignorada por git: claves de vista previa que Next genera en cada build). Falsos positivos |

## Búsqueda manual en todo el historial (`git log --all -p`)

- `.env`: nunca se versionó un `.env`; solo `.env.example`, cuyo historial tiene únicamente valores de ejemplo (`generate-with-npx-auth-secret`, `mongodb://localhost:27017/fileflip`, `no-reply@example.com`…).
- MongoDB con usuario y contraseña (`mongodb(+srv)://usuario:clave@`): ninguno.
- Google: claves `AIza…`: ninguna; `GOCSPX-` aparece solo como `GOCSPX-…` (ejemplo truncado en `docs/launch-checklist.md`).
- Resend `re_…`: solo `re_XXXXXXXX` de ejemplo. Mercado Pago `APP_USR-…`/`TEST-…`: solo ejemplos truncados. AdSense: solo `ca-pub-0000000000000000` y `ca-pub-1234567890123456` (ejemplos y tests).
- Claves privadas (`BEGIN … PRIVATE KEY`), tokens de GitHub (`ghp_`), `sk_live_`: ninguno.
- Correos personales: solo los de autores de licencias de terceros (textos de licencia en créditos) y `tu-correo@gmail.com` de ejemplo. El correo del dueño no aparece; los commits del dueño usan su dirección `noreply` de GitHub. `ADMIN_EMAILS` se lee solo de la variable de entorno; los tests usan `owner@fileflip.app`.
- Falso positivo conocido de GitGuardian: el generador de contraseñas (`password-generator`) tiene nombres como `password` en el código y en los textos, sin ningún valor secreto.

## Archivos que se publicarían

- Capturas (`docs/screenshots/`): el panel de administración y "Mi cuenta" se capturaron con datos de prueba (`admin@example.com`, estadísticas inventadas). Sin datos reales.
- Fixtures (`tests/fixtures/`): generados por scripts (`scripts/fixtures/`): imágenes sintéticas (degradados), audio de voces sintéticas (espeak-ng y Supertonic), documentos de prueba. `exif-gps.*` tiene una posición GPS inventada a propósito (centro de Buenos Aires) para probar que se borra.
- **Dato a mantener**: el nombre del dueño ("Juan Pablo Aste") y su localidad (Vicente López) están en los Términos y la Política de privacidad (`docs/legal/*-borrador.md`, `messages/*.json`). Ya son públicos en el sitio y la ley exige identificar al responsable; no se cambian.
- Se cambió el valor por defecto de `scripts/smoke-production.mjs` de la URL interna de Railway (`app-production-….up.railway.app`, el origen detrás de Cloudflare) a `https://fileflect.com`. La URL vieja queda en el historial: no es un secreto, pero permite llegar al origen sin pasar por Cloudflare; si eso preocupa, se puede cambiar el dominio generado en Railway (*Settings → Networking*).
- Notas internas: `PLAN.md`, `PROGRESS.md` y `docs/` son el registro del proyecto en español; no contienen claves. `docs/legal/pendientes-legales.md` menciona pendientes fiscales y legales del dueño: revisar si prefiere no publicarlos (no es un secreto).
- `.claude/skills/` son skills de Anthropic con licencia Apache-2.0 (incluyen su `LICENSE.txt`).

## Conclusión

Nada que rotar. Se puede publicar el repo con su historial. Repetir el escaneo justo antes de cambiar la visibilidad si hubo commits nuevos:

```bash
gitleaks git --log-opts=--all .
```
