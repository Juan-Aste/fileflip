# Medición final de la fase 2

- Fecha: 2026-10-20, commit `2946f58` de `dev` (fase 2 completa: 2A, 2B y 2C).
- Método: `npm run build && npx next start -p 3000`, luego `scripts/perf/lighthouse.sh http://localhost:3000 3` (Lighthouse 13.5, móvil emulado, 4G lento simulado, CPU ×4, mediana de 3).

## Resultado

| Página | Perf | A11y | SEO | FCP | LCP | TBT | CLS | SI | JS (transfer) |
|---|---|---|---|---|---|---|---|---|---|
| home (/es) | 98 | 100 | 100 | 1.2 s | 2.2 s | 70 ms | 0 | 1.2 s | 142 KB |
| image-conversion (/es/jpg-a-webp) | 98 | 100 | 100 | 1.2 s | 2.4 s | 50 ms | 0 | 1.2 s | 142 KB |
| pdf-conversion (/es/pdf-a-jpg) | 98 | 100 | 100 | 1.2 s | 2.3 s | 40 ms | 0 | 1.2 s | 142 KB |
| pdf-tool (/es/comprimir-pdf) | 98 | 100 | 100 | 1.2 s | 2.3 s | 100 ms | 0 | 1.2 s | 149 KB |
| longtail (/es/heic-a-jpg-desde-iphone) | 98 | 100 | 100 | 1.2 s | 2.3 s | 80 ms | 0 | 1.2 s | 142 KB |
| pricing (/es/pricing) | 97 | 100 | 100 | 1.2 s | 2.6 s | 80 ms | 0 | 1.2 s | 147 KB |

## Comparación con el final de 2B (misma versión de Lighthouse)

- Prácticamente igual (rendimiento 97–98 vs 97–99, LCP 2,2–2,6 s vs 2,2–2,4 s; las diferencias están dentro de la variación entre corridas del contenedor). El JS transferido no cambió: el panel de administración (2C) usa solo componentes de servidor y gráficos SVG sin librería, y no agrega nada al bundle de las páginas públicas (JS compartido: 103 kB).
- El beacon de visitas (2C.2c) se envía en `requestIdleCallback` y no afecta la carga.

## Resumen de toda la fase 2

| | Base (2026-10-19, Lighthouse 12) | Final (Lighthouse 13.5) |
|---|---|---|
| Rendimiento móvil | 99 | 97–98 |
| Accesibilidad | 100 | 100 |
| SEO | 100 (precios 91) | 100 |
| CLS | 0 | 0 |
| LCP | 2,0–2,1 s | 2,2–2,6 s |
| JS transferido | 142–151 KB | 142–149 KB |

- La meta (≥ 90 en portada y conversiones, sin empeorar accesibilidad ni SEO) se cumple.
- Las versiones de Lighthouse no son directamente comparables (ver `2026-10-20-2B-final.md`: con la 13.5, el commit de 2A daba 99 y SEO 92). El costo en FCP/LCP respecto de 2A viene de la fuente de texto del diseño de 2B.
