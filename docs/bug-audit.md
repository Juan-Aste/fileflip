# Auditoría de bugs (fase 6)

Registro de hallazgos. Gravedad: **crítica** (rompe una herramienta, el login o los pagos para muchos usuarios), **alta**, **media**, **baja** (cosmético). Estado: abierto / arreglado / dueño (necesita una decisión o configuración del dueño) / descartado.

| ID | Página / herramienta | Navegador y viewport | Pasos para reproducir | Gravedad | Estado | Commit |
|----|----------------------|----------------------|-----------------------|----------|--------|--------|
| B-01 | Auth.js (todas las páginas: consulta de sesión del header, `/api/auth/session`, `/account`, `/admin`) | Servidor (cualquier navegador) | Arrancar la app sin `MONGODB_URI` pero con un método de email habilitado (`RESEND_API_KEY`, `EMAIL_SERVER` o `AUTH_EMAIL_LOG_LINKS=true`, o `next dev`). Cada llamada de Auth.js responde 500 "There was a problem with the server configuration" (`MissingAdapter: Email login requires an adapter`): nadie puede iniciar sesión, ni con Google, y `/admin` da 404 aunque la sesión sea válida. En producción no pasa mientras `MONGODB_URI` esté configurada. Encontrado al construir la prueba 6A.1 | media | abierto (6D.1) | |

## 6A.1 — Clicabilidad de todas las páginas (2026-10-23)

`tests/e2e/clickable.spec.ts` + `tests/e2e/hit-test.ts`: 216 páginas (portada en los 5 idiomas, catálogo, 16 categorías, las herramientas publicadas, conversiones, cola larga, precios, login, verificación, contacto, legales, créditos) más `/es/account` y `/es/admin` con una sesión JWT de administrador de prueba, en 1280×800, 768×1024 y 390×844, claro y oscuro (6 combinaciones, 90 tests, ~10 min con 4 workers). Para cada enlace, botón, input, select, textarea, label, summary y rol interactivo visible: `document.elementFromPoint` en el centro y en las 4 esquinas internas (con margen según el `border-radius`) debe devolver el elemento o un descendiente; además, fuera de pantalla, scroll horizontal de la página y objetivos táctiles < 24×24 px en tablet y móvil con la excepción de espaciado de WCAG 2.5.8 (un círculo de 24 px centrado en el objetivo no toca otro objetivo), enlaces en línea dentro de un texto y controles nativos sin estilo. Los botones deshabilitados no se exigen (ignoran el puntero a propósito). Un test de control inyecta una capa invisible sobre la portada y dos botones de 16 px pegados y verifica que el detector los reporta.

**Resultado**: ningún elemento tapado, fuera de pantalla ni con scroll horizontal en las 216 páginas × 6 combinaciones; ningún objetivo táctil chico sin espacio suficiente. El arreglo de la capa decorativa de la fase 5 se mantiene. Hallazgo colateral: B-01.

## 6A.2 — Estados abiertos (2026-10-23)

`tests/e2e/open-states.spec.ts` (19 tests): el mismo detector, limitado al elemento abierto cuando corresponde, en 390×844 y 1280×800, claro y oscuro: buscador (Ctrl+K en escritorio, botón en móvil) con resultados y clic real en un resultado; acordeones de preguntas frecuentes y paneles de opciones abiertos; convertidor de la portada antes y después de convertir; resultados de unir PDF, comprimir imágenes y extraer ZIP (un enlace de descarga por archivo); menú móvil abierto (claro y oscuro; el botón de cerrar sigue alcanzable y un enlace cierra el menú y navega); selector de idioma dentro del menú móvil (mantiene la página: `/es/unir-pdf` → `/pt/juntar-pdf`, `lang="pt"`).

**Resultado**: sin hallazgos.
