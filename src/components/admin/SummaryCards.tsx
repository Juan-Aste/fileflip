import { AlertTriangle, BadgeDollarSign, Crown, Eye, FolderClock, HardDrive, RefreshCw, Timer, UserPlus } from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import { formatBytes, formatNumber, formatPercent } from "@/lib/format";
import { formatDuration } from "@/lib/admin/format";
import { adminTranslator } from "@/lib/admin/messages";
import type { AdminStats } from "@/lib/admin/stats";

const num = (n: number) => formatNumber(n, "es");
const bytes = (n: number) => formatBytes(n, "es");

function trend(change: number | null) {
  const t = adminTranslator();
  if (change === null) return { text: t("summary.noPrevious"), direction: "none" as const };
  const sign = change > 0 ? "+" : "";
  return {
    text: t("summary.vsPrevious", { change: `${sign}${formatPercent(change, "es")}` }),
    direction: change > 0 ? ("up" as const) : change < 0 ? ("down" as const) : ("flat" as const),
  };
}

export default function SummaryCards({ stats }: { stats: AdminStats }) {
  const t = adminTranslator();
  const { conversions, quality, visits, accounts, temp } = stats;
  const na = t("summary.notAvailable");
  const duration = (ms: number | null) => (ms === null ? na : formatDuration(ms));
  return (
    <section aria-labelledby="summary-title" className="flex flex-col gap-3">
      <h2 id="summary-title" className="text-xl font-bold">
        {t("summary.title")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={RefreshCw}
          label={t("summary.conversions")}
          value={num(conversions.total)}
          trend={trend(conversions.change)}
          detail={`${t("summary.conversionsDetail", { succeeded: num(conversions.succeeded), failed: num(conversions.failed) })} · ${t(
            "summary.engines",
            { browser: num(conversions.engines.browser), server: num(conversions.engines.server) },
          )}`}
        />
        <StatCard icon={Eye} label={t("summary.visits")} value={num(visits.total)} trend={trend(visits.change)} />
        <StatCard
          icon={UserPlus}
          label={t("summary.newUsers")}
          value={num(accounts.newUsers)}
          trend={trend(accounts.change)}
          detail={t("summary.totalUsers", { total: num(accounts.totalUsers) })}
        />
        <StatCard
          icon={Crown}
          label={t("summary.activePro")}
          value={num(accounts.activeSubscriptions)}
          detail={t("summary.subscriptionsDetail", { new: num(accounts.newSubscriptions), cancelled: num(accounts.cancellations) })}
        />
        <StatCard
          icon={BadgeDollarSign}
          label={t("summary.mrr")}
          value={accounts.mrr.length ? accounts.mrr.map((m) => `${m.currency} ${formatNumber(m.amount, "es", { maximumFractionDigits: 2 })}`).join(" · ") : na}
          detail={accounts.mrr.length ? undefined : t("summary.mrrNone")}
        />
        <StatCard
          icon={HardDrive}
          label={t("summary.processed")}
          value={bytes(quality.inputBytes)}
          detail={t("summary.processedDetail", { output: bytes(quality.outputBytes) })}
        />
        <StatCard
          icon={Timer}
          label={t("summary.avgDuration")}
          value={duration(quality.avgDurationMs)}
          detail={t("summary.avgDurationDetail", {
            browser: duration(quality.avgDurationByEngine.browser),
            server: duration(quality.avgDurationByEngine.server),
          })}
        />
        <StatCard
          icon={AlertTriangle}
          label={t("summary.errors")}
          value={num(conversions.failed)}
          detail={conversions.total ? t("summary.errorRate", { rate: formatPercent(conversions.failed / conversions.total, "es") }) : undefined}
        />
        <StatCard
          icon={FolderClock}
          label={t("summary.temp")}
          value={num(temp.files)}
          detail={
            temp.files
              ? t("summary.tempDetail", { bytes: bytes(temp.bytes), age: formatDuration(temp.oldestMs ?? 0) })
              : t("summary.tempEmpty")
          }
        />
      </div>
    </section>
  );
}
