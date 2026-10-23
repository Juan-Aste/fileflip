import { emailTransport } from "@/lib/email/send";

type Env = Record<string, string | undefined>;

/**
 * Auth.js refuses every request in production without AUTH_SECRET
 * (MissingSecret → HTTP 500); in development it falls back to a default one.
 */
export function authSecretMissing(env: Env = process.env) {
  return env.NODE_ENV === "production" && !env.AUTH_SECRET;
}

/** Which sign-in methods are configured (the login page only shows those). */
export function getAuthProviders(env: Env = process.env) {
  if (authSecretMissing(env)) return { google: false, email: false };
  // Without Resend or SMTP, magic links are printed to the server log: always in
  // development, and in production only if explicitly allowed (staging).
  const logLinks = env.NODE_ENV !== "production" || env.AUTH_EMAIL_LOG_LINKS === "true";
  return {
    google: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
    // Magic links need the database adapter: without MONGODB_URI Auth.js answers
    // every call with MissingAdapter (HTTP 500), Google included (bug B-01).
    email: Boolean(env.MONGODB_URI) && (emailTransport(env) !== "log" || logLinks),
  };
}
