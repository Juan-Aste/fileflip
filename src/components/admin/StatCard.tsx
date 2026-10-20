import type { LucideIcon } from "lucide-react";
import { card } from "@/components/ui/styles";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  /** Change vs the previous period, already formatted, and its sign. */
  trend?: { text: string; direction: "up" | "down" | "flat" | "none" };
};

const trendColor = { up: "text-success", down: "text-danger", flat: "text-muted", none: "text-muted" };

export default function StatCard({ icon: Icon, label, value, detail, trend }: Props) {
  return (
    <div className={`${card} flex flex-col gap-1 p-4`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-muted">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        {label}
      </p>
      <p className="font-display text-2xl font-extrabold tabular-nums tracking-tight">{value}</p>
      {trend && <p className={`text-sm font-semibold ${trendColor[trend.direction]}`}>{trend.text}</p>}
      {detail && <p className="text-sm text-muted">{detail}</p>}
    </div>
  );
}
