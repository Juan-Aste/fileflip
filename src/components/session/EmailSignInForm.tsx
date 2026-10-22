"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircle, Mail } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { buttonPrimary, field } from "@/components/ui/styles";

/** The whole request (CSRF token + sign-in) gives up after this long. */
export const CLIENT_TIMEOUT_MS = 20_000;

type Failure = "emailInvalid" | "sendError" | "sendTimeout" | "networkError";

// Same rule as <input type="email">, kept here so the form can show its own message.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Magic-link form. Posts to Auth.js from the browser (instead of a server
 * action) so it can show progress, time out and report errors.
 */
export default function EmailSignInForm({ redirectTo }: { redirectTo: string }) {
  const t = useTranslations("Login");
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  // A ref, not state: a second click in the same frame must already see it.
  const inFlight = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const message = useRef<HTMLParagraphElement>(null);

  function fail(reason: Failure) {
    inFlight.current = false;
    setSending(false);
    setFailure(reason);
    // Wait for the message to render before moving focus to it.
    requestAnimationFrame(() => (reason === "emailInvalid" ? input.current : message.current)?.focus());
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!EMAIL_RE.test(email)) return fail("emailInvalid");

    inFlight.current = true;
    setSending(true);
    setFailure(null);
    // setTimeout rather than AbortSignal.timeout, so tests can fake the clock.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), CLIENT_TIMEOUT_MS);
    const { signal } = controller;
    try {
      const csrf = await fetch("/api/auth/csrf", { signal });
      const { csrfToken } = (await csrf.json()) as { csrfToken?: string };
      if (!csrf.ok || !csrfToken) return fail("sendError");
      const res = await fetch("/api/auth/signin/nodemailer", {
        method: "POST",
        // Auth.js answers { url } instead of a redirect with this header.
        headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" },
        body: new URLSearchParams({ email, csrfToken, callbackUrl: redirectTo }),
        signal,
      });
      const { url } = (await res.json().catch(() => ({}))) as { url?: string };
      const target = url ? new URL(url, location.href) : null;
      if (!res.ok || !target || target.searchParams.has("error") || !target.pathname.endsWith("/login/verify")) {
        return fail("sendError");
      }
      // Stays "sending" until the "check your email" page replaces this one.
      router.push("/login/verify");
    } catch (error) {
      fail(error instanceof DOMException && error.name === "TimeoutError" ? "sendTimeout" : "networkError");
    } finally {
      clearTimeout(timer);
    }
  }

  const invalid = failure === "emailInvalid";
  return (
    <form onSubmit={submit} noValidate aria-busy={sending} className="flex flex-col gap-3">
      <label htmlFor="email" className="text-sm font-medium">
        {t("emailLabel")}
      </label>
      <input
        ref={input}
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder={t("emailPlaceholder")}
        aria-invalid={invalid || undefined}
        aria-describedby={failure ? "email-error" : undefined}
        readOnly={sending}
        onInput={() => invalid && setFailure(null)}
        className={`h-11 ${field}`}
      />
      {/* Always in the DOM so screen readers announce the text when it appears. */}
      <p
        ref={message}
        id="email-error"
        role="alert"
        tabIndex={-1}
        className={failure ? "rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger" : "sr-only"}
      >
        {failure ? t(failure) : ""}
      </p>
      <button type="submit" disabled={sending} aria-busy={sending} className={buttonPrimary}>
        {sending ? (
          <LoaderCircle aria-hidden="true" className="h-5 w-5 motion-safe:animate-spin" />
        ) : (
          <Mail aria-hidden="true" className="h-5 w-5" />
        )}
        {sending ? t("sending") : t("emailSubmit")}
      </button>
    </form>
  );
}
