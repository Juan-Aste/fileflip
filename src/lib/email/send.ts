import "server-only";
import { createTransport } from "nodemailer";
import { parseConnectionUrl } from "nodemailer/lib/shared";
import { localeFromSignInUrl, magicLinkEmail } from "./magic-link";

/** Upper bound for any single send, so a sign-in request never hangs. */
export const SEND_TIMEOUT_MS = 10_000;

const RESEND_ENDPOINT = "https://api.resend.com/emails";

type Mail = { to: string; from: string; subject: string; html: string; text: string };

/**
 * Which transport sends magic links. Resend's HTTP API wins: Railway blocks
 * outbound SMTP (ports 25/465/587) on every plan below Pro.
 */
export function emailTransport(env: Record<string, string | undefined> = process.env): "resend" | "smtp" | "log" {
  if (env.RESEND_API_KEY) return "resend";
  if (env.EMAIL_SERVER) return "smtp";
  return "log";
}

/** Sends through Resend's HTTP API; throws (without the key) on any failure. */
export async function sendWithResend(mail: Mail, apiKey: string) {
  let res: Response;
  try {
    res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(mail),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? `timed out after ${SEND_TIMEOUT_MS} ms` : String(error);
    console.error(`[email] Resend request failed: ${reason}`);
    throw new Error(`Resend request failed: ${reason}`);
  }
  if (!res.ok) {
    // Resend answers { statusCode, name, message }; keep only the message.
    const body = await res.text().catch(() => "");
    let message = body.slice(0, 300);
    try {
      message = (JSON.parse(body) as { message?: string }).message ?? message;
    } catch {}
    console.error(`[email] Resend rejected the email: HTTP ${res.status} ${message}`);
    throw new Error(`Resend rejected the email: HTTP ${res.status} ${message}`);
  }
}

/** SMTP transport with short timeouts (nodemailer's defaults are minutes). */
export function smtpTransport(server: string) {
  // A URL string can't carry extra options, so parse it and add the timeouts.
  return createTransport({
    ...parseConnectionUrl(server),
    connectionTimeout: SEND_TIMEOUT_MS,
    greetingTimeout: SEND_TIMEOUT_MS,
    socketTimeout: SEND_TIMEOUT_MS,
  });
}

/** Sends the localized magic-link email through whichever transport is configured. */
export async function sendMagicLink({ to, url, from }: { to: string; url: string; from: string }) {
  const mail = { to, from, ...magicLinkEmail(url, localeFromSignInUrl(url)) };
  const transport = emailTransport();
  if (transport === "resend") return sendWithResend(mail, process.env.RESEND_API_KEY!);
  if (transport === "smtp") {
    await smtpTransport(process.env.EMAIL_SERVER!).sendMail(mail);
    return;
  }
  console.info(`[dev] Magic link for ${to}: ${url}`);
}
