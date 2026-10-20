import { setRequestLocale } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/access";
import { adminTranslator } from "@/lib/admin/messages";

// Depends on the visitor's session.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Layouts and pages render in parallel: check here too.
  const session = await requireAdminPage();
  const t = adminTranslator();
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
        <p className="mt-1 text-sm text-muted">{t("signedInAs", { email: session.user.email ?? "" })}</p>
      </header>
      {!process.env.MONGODB_URI && <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">{t("noDatabase")}</p>}
    </div>
  );
}
