import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Fileflect";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// The bundled OG font has no CJK glyphs: Chinese gets the brand-only card.
const latinLocales = new Set(["es", "en", "pt", "fr"]);

export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });
  const title = latinLocales.has(locale) ? t("title") : "";
  // Rendered at build time (static per locale); satori reads WOFF, not WOFF2.
  const heading = await readFile(
    join(process.cwd(), "node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#f6f5f1",
          color: "#14181f",
          fontFamily: "Bricolage",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="96" height="96" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill="#0b6f6a" />
            <path
              d="M9 7.5A1.5 1.5 0 0 1 10.5 6H19l5 5v13.5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 9 24.5z"
              fill="#fff"
            />
            <path d="M19 6v3.5a1.5 1.5 0 0 0 1.5 1.5H24z" fill="#f26b3a" />
            <path
              d="M12.5 16.5h7l-2.2-2.2M20.5 20.5h-7l2.2 2.2"
              fill="none"
              stroke="#0b6f6a"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>
            File<span style={{ color: "#0b6f6a" }}>flect</span>
          </div>
        </div>
        {title && (
          <div style={{ display: "flex", fontSize: 60, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5, maxWidth: 980 }}>
            {title}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {["JPG", "PNG", "WEBP", "HEIC", "AVIF", "PDF"].map((f) => (
            <div
              key={f}
              style={{
                display: "flex",
                padding: "10px 22px",
                borderRadius: 999,
                background: "#e3f2ef",
                color: "#085954",
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              {f}
            </div>
          ))}
          <div style={{ display: "flex", width: 28, height: 28, borderRadius: 999, background: "#f26b3a", marginLeft: 12 }} />
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Bricolage", data: heading, weight: 800, style: "normal" }] },
  );
}
