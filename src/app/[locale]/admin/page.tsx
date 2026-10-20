import { setRequestLocale } from "next-intl/server";
import PeriodSelector from "@/components/admin/PeriodSelector";
import SummaryCards from "@/components/admin/SummaryCards";
import { formatDate } from "@/lib/format";
import { resolvePeriod } from "@/lib/admin/period";
import { requireAdminPage } from "@/lib/admin/access";
import { adminTranslator } from "@/lib/admin/messages";
import { adminStats, type AdminStats } from "@/lib/admin/stats";

// Depends on the visitor's session.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
};

export default async function AdminPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const period = resolvePeriod(await searchParams);
  const day = (d: Date) => formatDate(d, "es", { dateStyle: "medium", timeZone: "UTC" });
  const lastDay = (d: Date) => day(new Date(d.getTime() - 1));
  setRequestLocale(locale);
  // Layouts and pages render in parallel: check here too.
  const session = await requireAdminPage();
  const t = adminTranslator();
  let stats: AdminStats | null = null;
  let failed = false;
  if (process.env.MONGODB_URI) {
    try {
      stats = await adminStats(period);
    } catch (error) {
      console.error("Admin stats failed", error);
      failed = true;
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
        <p className="mt-1 text-sm text-muted">{t("signedInAs", { email: session.user.email ?? "" })}</p>
      </header>
      <section className="flex flex-col gap-2">
        <PeriodSelector period={period} basePath={`/${locale}/admin`} />
        <p className="text-sm text-muted">
          {t("period.range", { from: day(period.start), to: lastDay(period.end) })} ·{" "}
          {t("period.previous", { from: day(period.previous.start), to: lastDay(period.previous.end) })}
        </p>
      </section>
      {!process.env.MONGODB_URI && <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">{t("noDatabase")}</p>}
      {failed && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {t("summary.error")}
        </p>
      )}
      {stats && <SummaryCards stats={stats} />}
    </div>
  );
}
