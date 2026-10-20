import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";

/** Normalized emails from a comma-separated list (ADMIN_EMAILS). */
export function parseAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined, raw = process.env.ADMIN_EMAILS): boolean {
  if (!email) return false;
  return parseAdminEmails(raw).has(email.trim().toLowerCase());
}

/** The current session if it belongs to an admin, otherwise null. */
export async function getAdminSession(): Promise<Session | null> {
  // Opt into dynamic rendering before the catch below, which would otherwise
  // swallow Next's "dynamic usage" signal and prerender a 404 at build time.
  await headers();
  const session = await auth().catch(() => null);
  return session?.user?.id && isAdminEmail(session.user.email) ? session : null;
}

/** For admin pages and layouts: anyone else gets the regular 404. */
export async function requireAdminPage(): Promise<Session> {
  const session = await getAdminSession();
  if (!session) notFound();
  return session;
}

/**
 * For admin API routes. Returns the session, or a 404 response so the API
 * does not reveal that it exists.
 */
export async function requireAdminApi(): Promise<{ session: Session } | { response: Response }> {
  const session = await getAdminSession();
  if (!session) return { response: Response.json({ error: "notFound" }, { status: 404 }) };
  return { session };
}
