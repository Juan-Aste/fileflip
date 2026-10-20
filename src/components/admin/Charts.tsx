import BarList from "@/components/admin/BarList";
import LineChart from "@/components/admin/LineChart";
import { formatNumber } from "@/lib/format";
import { adminTranslator } from "@/lib/admin/messages";
import type { CsvTableId } from "@/lib/admin/csv";
import type { AdminStats } from "@/lib/admin/stats";
import type { TopConversion } from "@/lib/admin/stats/conversions";

const regionNames = new Intl.DisplayNames(["es"], { type: "region" });
const languageNames = new Intl.DisplayNames(["es"], { type: "language" });

function displayName(names: Intl.DisplayNames, code: string) {
  try {
    return names.of(code.length === 2 ? code.toUpperCase() : code) ?? code;
  } catch {
    return code;
  }
}

export function conversionLabel(row: Pick<TopConversion, "tool" | "from" | "to">, toolName: (tool: string) => string) {
  return row.tool === "convert" ? `${(row.from ?? "?").toUpperCase()} → ${(row.to ?? "?").toUpperCase()}` : toolName(row.tool);
}

/** Every chart of the panel; server components only, so nothing here ships JS. */
export default function Charts({ stats, csvHref }: { stats: AdminStats; csvHref: (table: CsvTableId) => string }) {
  const t = adminTranslator();
  const { conversions, quality, visits, accounts } = stats;
  const monthly = conversions.perBucket.length > 0 && conversions.perBucket[0].key.length === 7;
  const per = (day: Parameters<typeof t>[0], month: Parameters<typeof t>[0]) => t(monthly ? month : day);
  const total = (n: number) => t("charts.total", { total: formatNumber(n, "es") });
  const bars = { empty: t("charts.empty"), labelHeader: t("charts.label"), countHeader: t("charts.count") };
  const toolName = (tool: string) => t(`charts.tools.${tool}` as Parameters<typeof t>[0]);
  return (
    <section aria-labelledby="charts-title" className="flex flex-col gap-3">
      <h2 id="charts-title" className="text-xl font-bold">
        {t("charts.title")}
      </h2>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <LineChart
            title={per("charts.conversionsPerDay", "charts.conversionsPerMonth")}
            series={conversions.perBucket.map((b) => ({ key: b.key, value: b.total }))}
            summary={total(conversions.total)}
            csvHref={csvHref("conversions-per-day")}
          />
        </div>
        <LineChart
          title={per("charts.visitsPerDay", "charts.visitsPerMonth")}
          series={visits.perBucket.map((b) => ({ key: b.key, value: b.count }))}
          summary={total(visits.total)}
          csvHref={csvHref("visits-per-day")}
        />
        <LineChart
          title={per("charts.usersPerDay", "charts.usersPerMonth")}
          series={accounts.newUsersPerBucket.map((b) => ({ key: b.key, value: b.count }))}
          summary={total(accounts.newUsers)}
          csvHref={csvHref("users-per-day")}
        />
        <BarList
          {...bars}
          title={t("charts.topConversions")}
          csvHref={csvHref("top-conversions")}
          rows={conversions.top.map((row) => ({ label: conversionLabel(row, toolName), count: row.count }))}
        />
        <div className="flex flex-col gap-3">
          <BarList
            {...bars}
            title={t("charts.engines")}
            csvHref={csvHref("engines")}
            rows={
              conversions.total
                ? [
                    { label: t("charts.browser"), count: conversions.engines.browser },
                    { label: t("charts.server"), count: conversions.engines.server },
                  ]
                : []
            }
          />
          <BarList
            {...bars}
            title={t("charts.errors")}
            csvHref={csvHref("errors")}
            rows={quality.errors.map((e) => ({ label: e.code === "unknown" ? t("charts.unknownError") : e.code, count: e.count }))}
          />
        </div>
        <BarList
          {...bars}
          title={t("charts.byLocale")}
          csvHref={csvHref("visits-by-locale")}
          rows={visits.byLocale.map((r) => ({ label: `${displayName(languageNames, r.key)} (${r.key})`, count: r.count }))}
        />
        <BarList
          {...bars}
          title={t("charts.byCountry")}
          csvHref={csvHref("visits-by-country")}
          rows={visits.byCountry.map((r) => ({
            label: r.key === "unknown" ? t("charts.unknownCountry") : displayName(regionNames, r.key),
            count: r.count,
          }))}
        />
        <BarList
          {...bars}
          title={t("charts.byKind")}
          csvHref={csvHref("visits-by-page-kind")}
          rows={visits.byKind.map((r) => ({ label: t(`charts.kinds.${r.key}`), count: r.count }))}
        />
        <BarList {...bars} title={t("charts.topLongtail")}
          csvHref={csvHref("top-longtail")} rows={visits.topLongtail.map((r) => ({ label: r.key, count: r.count }))} />
      </div>
    </section>
  );
}
