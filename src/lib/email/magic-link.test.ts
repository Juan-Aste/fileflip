import { describe, expect, it } from "vitest";
import { localeFromSignInUrl, magicLinkEmail } from "./magic-link";

const signIn = (callback: string) =>
  `https://fileflip.app/api/auth/callback/nodemailer?callbackUrl=${encodeURIComponent(callback)}&token=abc&email=a%40b.c`;

describe("localeFromSignInUrl", () => {
  it("uses the locale of the page the user signed in from", () => {
    expect(localeFromSignInUrl(signIn("https://fileflip.app/pt/conta"))).toBe("pt");
    expect(localeFromSignInUrl(signIn("/fr/compte"))).toBe("fr");
  });

  it("falls back to Spanish", () => {
    expect(localeFromSignInUrl(signIn("https://fileflip.app/de/x"))).toBe("es");
    expect(localeFromSignInUrl("https://fileflip.app/api/auth/callback/nodemailer?token=1")).toBe("es");
    expect(localeFromSignInUrl("not a url")).toBe("es");
  });
});

describe("magicLinkEmail", () => {
  it("is translated and contains the link in HTML and text", () => {
    const url = signIn("/en/account");
    const mail = magicLinkEmail(url, "en");
    expect(mail.subject).toBe("Your Fileflect sign-in link");
    expect(mail.html).toContain('lang="en"');
    expect(mail.html).toContain(url.replace(/&/g, "&amp;"));
    expect(mail.text).toContain(url);
    expect(magicLinkEmail(url, "zh").subject).toContain("登录");
  });

  it("escapes the URL in HTML", () => {
    const mail = magicLinkEmail('https://x.y/?a="><script>', "es");
    expect(mail.html).not.toContain("<script>");
  });
});
