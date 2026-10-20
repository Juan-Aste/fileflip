import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

/** Error message inside a tool, announced to screen readers. */
export default function ToolAlert({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="alert"
      className={`flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger ${className}`}
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
