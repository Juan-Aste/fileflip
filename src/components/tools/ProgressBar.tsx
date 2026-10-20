import { LoaderCircle } from "lucide-react";

export default function ProgressBar({ value, label }: { value: number; label: string }) {
  const percent = Math.round(value * 100);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-brand">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <LoaderCircle aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
        <span className="flex-1">{label}</span>
        <span aria-hidden="true" className="tabular-nums">
          {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-surface/70"
      >
        <div
          className="h-full rounded-full bg-brand-solid transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(4, value * 100)}%` }}
        />
      </div>
    </div>
  );
}
