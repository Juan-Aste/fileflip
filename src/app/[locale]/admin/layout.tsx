import type { Metadata } from "next";
import { getAdminSession, requireAdminPage } from "@/lib/admin/access";
import { adminTranslator } from "@/lib/admin/messages";

// Depends on the visitor's session; never cached or prerendered.
export const dynamic = "force-dynamic";

// Metadata renders even when the page 404s: don't name the panel to outsiders.
export async function generateMetadata(): Promise<Metadata> {
  const robots = { index: false, follow: false };
  return (await getAdminSession()) ? { title: adminTranslator()("metaTitle"), robots } : { robots };
}

/** Everything under /[locale]/admin is checked on the server: non-admins get a 404. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return <div className="mx-auto w-full max-w-6xl px-4 py-10">{children}</div>;
}
