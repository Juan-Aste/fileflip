#!/usr/bin/env bash
# Mobile Lighthouse run (median of N) against a running `next start`.
# Usage: scripts/perf/lighthouse.sh [base_url] [runs]
# PAGES_FILTER (a bash regex on the page names) runs only some pages.
# Needs `lighthouse` (npm i -g lighthouse, or LIGHTHOUSE=/path/to/bin) and a
# Chromium (CHROME_PATH; defaults to the Playwright one if present).
set -euo pipefail
BASE="${1:-http://localhost:3000}"
RUNS="${2:-3}"
LH="${LIGHTHOUSE:-lighthouse}"
OUT="${OUT_DIR:-$(mktemp -d)}"
if [ -z "${CHROME_PATH:-}" ] && [ -x /opt/pw-browsers/chromium-1194/chrome-linux/chrome ]; then
  export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
fi
PAGES=(
  "home /es"
  "image-conversion /es/jpg-a-webp"
  "pdf-conversion /es/pdf-a-jpg"
  "pdf-tool /es/comprimir-pdf"
  "longtail /es/heic-a-jpg-desde-iphone"
  "pricing /es/pricing"
  "all-tools /es/herramientas"
  "category /es/herramientas-pdf"
  "tool-merge /es/unir-pdf"
  "tool-data /es/generador-hash"
  "tool-utility /es/conversor-de-unidades"
  "tool-image /es/recortar-imagen"
  "tool-pdf-images /es/extraer-imagenes-pdf"
  "tool-pdf-protect /es/proteger-pdf"
  "tool-font /es/convertir-fuentes"
  "tool-archive /es/extraer-zip"
  "tool-ocr /es/imagen-a-texto"
  "tool-sheet /es/convertir-hoja-de-calculo"
  "tool-epub /es/convertir-epub"
  "tool-create-epub /es/crear-epub"
  "tool-epub-pdf /es/epub-a-pdf"
  "category-audio /es/herramientas-de-audio"
  "tool-audio /es/convertir-audio"
  "tool-video /es/recortar-video"
  "tool-3d /es/convertir-modelo-3d"
  "tool-cad /es/convertir-dxf"
  "tool-id-photo /es/foto-carnet"
  "tool-scan /es/escanear-documento"
  "tool-bg /es/quitar-fondo"
  "tool-tts /es/leer-texto-en-voz-alta"
  "tool-tts-en /en/text-to-speech"
  "tool-tts-zh /zh/text-to-speech"
)
if [ -n "${PAGES_FILTER:-}" ]; then
  sel=(); for p in "${PAGES[@]}"; do [[ "${p%% *}" =~ $PAGES_FILTER ]] && sel+=("$p"); done; PAGES=("${sel[@]}")
fi
# Warm up the server (first render of each route).
for p in "${PAGES[@]}"; do curl -s -o /dev/null "$BASE${p#* }"; done
echo "| Página | Perf | A11y | SEO | FCP | LCP | TBT | CLS | SI | JS (transfer) |"
echo "|---|---|---|---|---|---|---|---|---|---|"
for p in "${PAGES[@]}"; do
  name="${p%% *}"; path="${p#* }"
  for i in $(seq 1 "$RUNS"); do
    "$LH" "$BASE$path" --quiet --output=json --output-path="$OUT/$name-$i.json" \
      --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
      --only-categories=performance,accessibility,seo,best-practices >/dev/null 2>&1
  done
  node -e '
    const [out, name, runs] = process.argv.slice(1);
    const rs = Array.from({ length: +runs }, (_, i) => require(`${out}/${name}-${i + 1}.json`));
    rs.sort((a, b) => a.categories.performance.score - b.categories.performance.score);
    const r = rs[Math.floor(rs.length / 2)], a = r.audits;
    const js = (a["resource-summary"].details.items.find((i) => i.resourceType === "script") || {}).transferSize || 0;
    const s = (c) => Math.round(r.categories[c].score * 100);
    console.log(`| ${name} (${r.finalDisplayedUrl.replace(/^https?:\/\/[^/]+/, "")}) | ${s("performance")} | ${s("accessibility")} | ${s("seo")} | ` +
      ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"]
        .map((k) => a[k].displayValue).join(" | ") + ` | ${Math.round(js / 1024)} KB |`);
  ' "$OUT" "$name" "$RUNS"
done
echo
echo "Reports: $OUT"
