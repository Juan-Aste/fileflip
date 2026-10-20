# Identidad visual de FileFlip

Guía corta para que todo el sitio se vea igual. Los valores viven como variables CSS en
`src/app/[locale]/globals.css` y se usan desde Tailwind (`bg-surface`, `text-muted`,
`font-display`, `shadow-card`…). **No uses colores sueltos de Tailwind** (`red-600`,
`indigo-500`…) en componentes: usa los tokens.

## Idea

"Papel y tinta" con un verde azulado profundo de marca: transmite calma, confianza y
privacidad (el archivo no sale del dispositivo), lejos del índigo/violeta genérico de las
plantillas SaaS. Un acento mandarina, usado con moderación, da calidez y marca el
"flip" (la transformación del archivo).

## Paleta

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `background` | `#f6f5f1` | `#0e1215` | Fondo de página (papel cálido / tinta) |
| `surface` | `#ffffff` | `#161c21` | Tarjetas, header, paneles |
| `surface-2` | `#efede7` | `#1d252b` | Zonas hundidas, filas alternas, chips |
| `foreground` | `#14181f` | `#e8ecef` | Texto principal |
| `muted` | `#5a6270` | `#9aa5ae` | Texto secundario |
| `border` / `border-strong` | `#e2dfd7` / `#c9c5ba` | `#27323a` / `#3a4751` | Bordes |
| `brand` | `#0b6f6a` | `#5fd4c6` | Enlaces, íconos, texto de marca |
| `brand-strong` | `#085954` | `#8ee3d8` | Hover de enlaces |
| `brand-soft` | `#e3f2ef` | `#10302e` | Fondos de insignias, estado "arrastrando" |
| `brand-solid` / `-hover` | `#0b6f6a` / `#085954` | igual | Botones con texto blanco |
| `accent` | `#f26b3a` | `#ff8a5c` | Decoración (formas, subrayados, puntos) |
| `accent-strong` | `#b5401a` | `#ff8a5c` | Texto en acento |
| `accent-soft` | `#fdebe2` | `#3a1f14` | Fondo de acento |
| `success` / `-soft` | `#067647` / `#e7f6ee` | `#47cd89` / `#0f2a1d` | Listo, ahorro |
| `warning` / `-soft` | `#93370d` / `#fffaeb` | `#fdb022` / `#2e2208` | Avisos |
| `danger` / `-soft` | `#b42318` / `#fef3f2` | `#f97066` / `#331412` | Errores |

Contraste medido (WCAG): `muted` sobre `background` 5,6:1 (oscuro 7,5:1); `brand` sobre
`surface` 6,0:1 (oscuro 9,6:1); blanco sobre `brand-solid` 6,0:1; `danger` 6,6:1
(oscuro 6,2:1); `success` 5,7:1 (oscuro 8,5:1); `warning` sobre `warning-soft` 7,2:1;
`accent-strong` sobre blanco 5,7:1. Todo ≥ AA (4,5:1). `accent` claro (`#f26b3a`) es
solo decorativo: no lleva texto.

## Tipografía

- **Títulos (`font-display`)**: Bricolage Grotesque (variable, 200–800). Grotesca con
  carácter, de ojo grande y algo condensada: da personalidad sin perder seriedad.
  `h1`–`h3` la usan automáticamente, con `letter-spacing: -0.015em`.
- **Texto (`font-sans`)**: Figtree (variable, 300–900). Geométrica, muy legible en
  tamaños chicos y en pantallas de celular.
- Ambas se sirven desde el propio sitio con `next/font/local` (paquetes
  `@fontsource-variable/*`, subconjunto latín, `display: swap`, fallback ajustado
  automáticamente para evitar saltos). El chino usa las fuentes del sistema
  (PingFang / Microsoft YaHei / Noto).
- Escala: `text-sm` (14) para ayudas, `text-base` (16) cuerpo, `text-lg` (18) entradillas,
  `text-2xl`/`3xl` títulos de sección, `text-4xl`→`text-6xl` el h1 de portada.
  Pesos: 400 texto, 500–600 etiquetas y botones, 700–800 títulos.

## Espaciado

Escala de Tailwind (múltiplos de 4 px). Convenciones:
- Contenedor: `mx-auto max-w-6xl px-4` (16 px de margen en móvil).
- Secciones: `py-12` en móvil, `sm:py-16`/`py-20` en escritorio.
- Dentro de tarjetas: `p-5` / `p-6`; separación entre elementos `gap-3`–`gap-6`.

## Radios

- `rounded-lg` (8 px): chips pequeños, inputs compactos.
- `rounded-xl` (12 px): botones, inputs, selects.
- `rounded-2xl` (16 px): tarjetas, paneles, zona para arrastrar.
- `rounded-full`: insignias, avatares, botones de ícono.

## Sombras

- `shadow-card`: elevación mínima para tarjetas sobre `background`.
- `shadow-lift`: hover de tarjetas clicables, menús desplegables y la zona para arrastrar.
- En oscuro las sombras casi no se ven: la separación la dan `border` y `surface-2`.

## Íconos

`lucide-react` (trazo 2, tamaño 16–20 px en línea, 24 px en tarjetas), siempre con
`aria-hidden` si hay texto al lado. Nada de emojis en la interfaz.

## Movimiento

Transiciones cortas (150–200 ms, `ease-out`) en hover, foco y cambios de estado. Todo
movimiento se desactiva con `prefers-reduced-motion: reduce` (regla global en
`globals.css`).

## Foco

Anillo global de 2 px con el token `ring` y separación de 2 px en `:focus-visible`.
