import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { emailTransport, sendMagicLink } from "@/lib/email/send";
import { planForUser } from "@/lib/billing";
import { getMongoClient } from "@/lib/mongo-client";

/** Which sign-in methods are configured (the login page only shows those). */
export function getAuthProviders() {
  // Without Resend or SMTP, magic links are printed to the server log: always in
  // development, and in production only if explicitly allowed (staging).
  const logLinks = process.env.NODE_ENV !== "production" || process.env.AUTH_EMAIL_LOG_LINKS === "true";
  return {
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    email: emailTransport() !== "log" || logLinks,
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
        from: process.env.EMAIL_FROM || "Fileflect <no-reply@example.com>",
        // The provider keeps its "nodemailer" id, but sends through Resend's
        // HTTP API when RESEND_API_KEY is set (see lib/email/send.ts).
        async sendVerificationRequest({ identifier, url, provider }) {
          await sendMagicLink({ to: identifier, url, from: provider.from! });
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
      async session({ session, user, token }) {
        const id = user?.id ?? token?.sub ?? "";
        return {
          expires: session.expires,
          user: {
            id,
            plan: await planForUser(id),
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
