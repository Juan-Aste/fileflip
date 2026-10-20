import { card } from "@/components/ui/styles";
import { barShares } from "@/lib/admin/charts";
import { formatNumber, formatPercent } from "@/lib/format";

type Props = {
  title: string;
  rows: Array<{ label: string; count: number }>;
  empty: string;
  /** Header of the label column, for screen readers. */
  labelHeader: string;
  countHeader: string;
};

/**
 * Ranked horizontal bars that are also a table (label, count and share of
 * the listed total), so the values never depend on the bar alone.
 */
export default function BarList({ title, rows, empty, labelHeader, countHeader }: Props) {
  const shares = barShares(rows);
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return (
    <figure className={`${card} flex flex-col gap-3 p-4`}>
      <figcaption className="font-bold">{title}</figcaption>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="sr-only">
            <tr>
              <th scope="col">{labelHeader}</th>
              <th scope="col">{countHeader}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} title={`${row.label}: ${formatNumber(row.count, "es")}`}>
                <th scope="row" className="py-1 pr-3 text-left font-normal">
                  <span className="relative block overflow-hidden rounded-md px-2 py-1">
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 rounded-md bg-brand/15"
                      style={{ width: `${Math.max(shares[i] * 100, 1)}%` }}
                    />
                    <span className="relative block truncate">{row.label}</span>
                  </span>
                </th>
                <td className="w-px whitespace-nowrap py-1 text-right tabular-nums">
                  <span className="font-semibold">{formatNumber(row.count, "es")}</span>
                  <span className="ml-2 inline-block w-10 text-muted">{formatPercent(row.count / total, "es")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
