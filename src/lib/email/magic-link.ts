import { defaultLocale, locales, type Locale } from "@/i18n/routing";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import fr from "../../../messages/fr.json";
import pt from "../../../messages/pt.json";
import zh from "../../../messages/zh.json";

const emailMessages: Record<Locale, (typeof es)["Email"]> = {
  es: es.Email,
  en: en.Email,
  pt: pt.Email,
  fr: fr.Email,
  zh: zh.Email,
};

/** The user's language, taken from the page they signed in from (/pt/... → pt). */
export function localeFromSignInUrl(url: string): Locale {
  try {
    const callback = new URL(url).searchParams.get("callbackUrl");
    const segment = callback ? new URL(callback, url).pathname.split("/")[1] : "";
    return (locales as readonly string[]).includes(segment) ? (segment as Locale) : defaultLocale;
  } catch {
    return defaultLocale;
  }
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Localized magic-link email (inline styles: email clients ignore stylesheets). */
export function magicLinkEmail(url: string, locale: Locale) {
  const t = emailMessages[locale];
  const link = escape(url);
  const html = `<!doctype html>
<html lang="${locale}">
<body style="margin:0;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a">
<span style="display:none">${escape(t.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px">
<tr><td style="padding:32px">
<p style="margin:0 0 24px;font-size:20px;font-weight:700">⇄ FileFlip</p>
<h1 style="margin:0 0 12px;font-size:22px">${escape(t.heading)}</h1>
<p style="margin:0 0 24px;line-height:1.5">${escape(t.body)}</p>
<p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:12px">${escape(t.button)}</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#64748b">${escape(t.fallback)}</p>
<p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${link}" style="color:#4f46e5">${link}</a></p>
<p style="margin:0;font-size:13px;color:#64748b">${escape(t.ignore)}</p>
</td></tr></table></td></tr></table>
</body></html>`;
  const text = `${t.heading}\n\n${t.body}\n\n${url}\n\n${t.ignore}\n`;
  return { subject: t.subject, html, text };
}
