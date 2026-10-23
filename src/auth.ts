import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { sendMagicLink } from "@/lib/email/send";
import { getAuthProviders } from "@/lib/auth-providers";
import { planForUser } from "@/lib/billing";
import { getMongoClient } from "@/lib/mongo-client";
import { recordTermsAcceptance } from "@/lib/terms-acceptance";

export { getAuthProviders };

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
    events: {
      // Signing in (Google or email) is accepting the current terms, as the
      // login page says next to the buttons: keep the version and the date.
      async signIn({ user }) {
        if (!process.env.MONGODB_URI || !user.id) return;
        await recordTermsAcceptance(user.id).catch((error) => console.warn("Could not record terms acceptance", error));
      },
    },
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
