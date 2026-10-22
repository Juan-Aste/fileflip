import { Download } from "lucide-react";
import { card } from "@/components/ui/styles";
import { formatNumber, formatPercent } from "@/lib/format";
import { categoryLabel, toolLabel } from "@/lib/admin/labels";
import { adminTranslator } from "@/lib/admin/messages";
import { entryCategory, type ToolUsage } from "@/lib/admin/stats/tools";

/** Every tool used in the period: uses, failures, failure rate and its most frequent error. */
export default function ToolUsageTable({ rows, csvHref }: { rows: ToolUsage[]; csvHref: string }) {
  const t = adminTranslator();
  const n = (value: number) => formatNumber(value, "es");
  return (
    <figure className={`${card} flex min-w-0 flex-col gap-3 p-4`}>
      <figcaption className="flex flex-col gap-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-bold">{t("charts.byToolTitle")}</span>
          <a href={csvHref} download className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            <Download aria-hidden="true" className="size-4" />
            CSV<span className="sr-only">: {t("charts.byToolTitle")}</span>
          </a>
        </span>
        <span className="text-sm text-muted">{t("charts.byToolCaption")}</span>
      </figcaption>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{t("charts.empty")}</p>
      ) : (
        // Scrolls inside its own box on a phone; focusable so the keyboard can scroll it.
        <div className="max-h-[32rem] overflow-auto" tabIndex={0} role="region" aria-label={t("charts.byToolTitle")}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-muted">
              <tr>
                <th scope="col" className="py-2 pr-3 font-semibold">{t("charts.columns.tool")}</th>
                <th scope="col" className="py-2 pr-3 font-semibold">{t("charts.columns.category")}</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("charts.columns.uses")}</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("charts.columns.failed")}</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("charts.columns.failRate")}</th>
                <th scope="col" className="py-2 font-semibold">{t("charts.columns.topError")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rate = row.total ? row.failed / row.total : 0;
                return (
                  <tr key={row.tool} className="border-t border-border">
                    <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                      {toolLabel(row.tool)}
                    </th>
                    <td className="py-1.5 pr-3 text-muted">
                      {row.tool === "convert" ? t("charts.columns.several") : categoryLabel(entryCategory(row.tool))}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">{n(row.total)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{n(row.failed)}</td>
                    <td className={`py-1.5 pr-3 text-right tabular-nums ${rate >= 0.2 ? "font-semibold text-danger" : ""}`}>
                      {formatPercent(rate, "es")}
                    </td>
                    <td className="py-1.5 font-mono text-xs">
                      {row.topError === null ? "—" : row.topError === "unknown" ? t("charts.unknownError") : row.topError}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
