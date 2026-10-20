import { CalendarRange } from "lucide-react";
import { buttonPrimarySmall, field } from "@/components/ui/styles";
import { dayKey, periodPresets, type Period } from "@/lib/admin/period";
import { adminTranslator } from "@/lib/admin/messages";

/** Plain links and a GET form: works without any client JavaScript. */
export default function PeriodSelector({ period, basePath }: { period: Period; basePath: string }) {
  const t = adminTranslator();
  const lastDay = dayKey(new Date(period.end.getTime() - 1));
  return (
    <nav aria-label={t("period.label")} className="flex flex-wrap items-center gap-2">
      {periodPresets
        .filter((p) => p !== "custom")
        .map((preset) => (
          <a
            key={preset}
            href={`${basePath}?period=${preset}`}
            aria-current={period.preset === preset ? "page" : undefined}
            className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm font-semibold transition hover:border-brand aria-[current=page]:border-brand-solid aria-[current=page]:bg-brand-solid aria-[current=page]:text-white"
          >
            {t(`period.${preset}`)}
          </a>
        ))}
      <form method="get" action={basePath} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="period" value="custom" />
        <label className="sr-only" htmlFor="period-from">
          {t("period.from")}
        </label>
        <input id="period-from" type="date" name="from" defaultValue={dayKey(period.start)} required className={`h-9 text-sm ${field}`} />
        <span aria-hidden="true" className="text-muted">
          –
        </span>
        <label className="sr-only" htmlFor="period-to">
          {t("period.to")}
        </label>
        <input id="period-to" type="date" name="to" defaultValue={lastDay} required className={`h-9 text-sm ${field}`} />
        <button type="submit" className={period.preset === "custom" ? buttonPrimarySmall : `${buttonPrimarySmall} opacity-90`}>
          <CalendarRange aria-hidden="true" className="h-4 w-4" />
          {t("period.custom")}
        </button>
      </form>
    </nav>
  );
}
