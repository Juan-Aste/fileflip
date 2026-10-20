import { card } from "@/components/ui/styles";
import { labelIndexes, lineGeometry } from "@/lib/admin/charts";
import { formatBucket } from "@/lib/admin/format";
import { formatNumber } from "@/lib/format";

type Props = {
  title: string;
  series: Array<{ key: string; value: number }>;
  /** Accessible summary, e.g. "120 conversiones en total". */
  summary: string;
};

const W = 600;
const H = 160;

/**
 * Single-series line chart rendered on the server as SVG (no client JS).
 * The plot stretches to the card width; labels are HTML so they keep their
 * size. Each bucket has a hover column with a native tooltip and a guide line.
 */
export default function LineChart({ title, series, summary }: Props) {
  const g = lineGeometry(series, W, H);
  const num = (n: number) => formatNumber(n, "es");
  const labels = labelIndexes(g.points.length);
  const mobileLabels = new Set([labels[0], labels[Math.floor(labels.length / 2)], labels.at(-1)]);
  const column = series.length > 1 ? W / (series.length - 1) : W;
  return (
    <figure className={`${card} flex flex-col gap-3 p-4`}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-bold">{title}</span>
        <span className="text-sm text-muted">{summary}</span>
      </figcaption>
      <div className="flex gap-2">
        <div aria-hidden="true" className="relative w-8 shrink-0 text-right text-xs tabular-nums text-muted">
          {g.ticks.map((t) => (
            <span key={t.value} className="absolute right-0 -translate-y-1/2" style={{ top: `${(t.y / H) * 100}%` }}>
              {num(t.value)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="block h-40 w-full overflow-visible"
            role="img"
            aria-label={`${title}: ${summary}`}
          >
            {g.ticks.map((t) => (
              <line
                key={t.value}
                x1={0}
                x2={W}
                y1={t.y}
                y2={t.y}
                className="stroke-border"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={g.area} className="fill-brand/10" />
            <path
              d={g.path}
              fill="none"
              className="stroke-brand"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {g.points.map((p) => (
              <g key={p.key} className="group">
                <title>{`${formatBucket(p.key)}: ${num(p.value)}`}</title>
                <rect x={p.x - column / 2} y={0} width={column} height={H} fill="transparent" />
                <line
                  x1={p.x}
                  x2={p.x}
                  y1={0}
                  y2={H}
                  className="stroke-muted opacity-0 group-hover:opacity-100"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </svg>
          <div aria-hidden="true" className="relative mt-1 h-4 text-xs text-muted">
            {labels.map((i) => {
              const p = g.points[i];
              // Narrow screens only fit the first, middle and last labels.
              const narrow = mobileLabels.has(i) ? "" : "max-sm:hidden";
              const left = (p.x / W) * 100;
              const align = left < 5 ? "" : left > 95 ? "-translate-x-full" : "-translate-x-1/2";
              return (
                <span key={p.key} className={`absolute whitespace-nowrap ${align} ${narrow}`} style={{ left: `${left}%` }}>
                  {formatBucket(p.key)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </figure>
  );
}
