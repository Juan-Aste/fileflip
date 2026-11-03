import { AudioLines, CalendarDays } from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import { formatNumber, formatPercent } from "@/lib/format";
import { adminTranslator } from "@/lib/admin/messages";
import type { TtsUsageSummary } from "@/lib/admin/tts";

const num = (n: number) => formatNumber(n, "es");

/** Characters sent to the cloud voice this month and today (task 13.3b). */
export default function TtsUsageCards({ usage }: { usage: TtsUsageSummary | null }) {
  const t = adminTranslator();
  return (
    <section aria-labelledby="tts-usage-title" className="flex flex-col gap-3">
      <h2 id="tts-usage-title" className="text-xl font-bold">
        {t("tts.title")}
      </h2>
      {!usage ? (
        <p className="text-sm text-muted">{t("tts.error")}</p>
      ) : (
        <>
          {!usage.enabled && <p className="text-sm text-muted">{t("tts.disabled")}</p>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={CalendarDays}
              label={t("tts.month")}
              value={num(usage.month)}
              detail={t("tts.monthDetail", {
                limit: num(usage.monthlyLimit),
                percent: formatPercent(usage.monthlyLimit ? usage.month / usage.monthlyLimit : 0, "es"),
              })}
            />
            <StatCard icon={AudioLines} label={t("tts.day")} value={num(usage.day)} detail={usage.shared ? t("tts.utc") : t("tts.memoryOnly")} />
          </div>
        </>
      )}
    </section>
  );
}
