import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { createTransport } from "nodemailer";
import { localeFromSignInUrl, magicLinkEmail } from "@/lib/email/magic-link";
import { getMongoClient } from "@/lib/mongo-client";

/** Which sign-in methods are configured (the login page only shows those). */
export function getAuthProviders() {
  // Without SMTP, magic links are printed to the server log: always in
  // development, and in production only if explicitly allowed (staging).
  const logLinks = process.env.NODE_ENV !== "production" || process.env.AUTH_EMAIL_LOG_LINKS === "true";
  return {
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    email: Boolean(process.env.EMAIL_SERVER) || logLinks,
  };
}

function config(): NextAuthConfig {
  const enabled = getAuthProviders();
  const providers: NextAuthConfig["providers"] = [];
  if (enabled.google) providers.push(Google);
  if (enabled.email) {
    providers.push(
      Nodemailer({
        server: process.env.EMAIL_SERVER || "smtp://localhost:25",
        from: process.env.EMAIL_FROM || "FileFlip <no-reply@example.com>",
        async sendVerificationRequest({ identifier, url, provider }) {
          const mail = magicLinkEmail(url, localeFromSignInUrl(url));
          if (!process.env.EMAIL_SERVER) {
            console.info(`[dev] Magic link for ${identifier}: ${url}`);
            return;
          }
          await createTransport(provider.server).sendMail({ to: identifier, from: provider.from, ...mail });
        },
      }),
    );
  }

  return {
    // Created per request so builds and pages work without MONGODB_URI.
    adapter: process.env.MONGODB_URI ? MongoDBAdapter(() => getMongoClient()) : undefined,
    providers,
    session: { strategy: process.env.MONGODB_URI ? "database" : "jwt" },
    trustHost: true,
    // Our pages live under a locale; the middleware adds it.
    pages: { signIn: "/login", verifyRequest: "/login/verify", error: "/login" },
    callbacks: {
      // Only expose what the UI needs (never the session token).
      session({ session, user, token }) {
        return {
          expires: session.expires,
          user: {
            id: user?.id ?? token?.sub ?? "",
            name: session.user?.name ?? null,
            email: session.user?.email ?? "",
            image: session.user?.image ?? null,
          },
        } as typeof session;
      },
    },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(config);
