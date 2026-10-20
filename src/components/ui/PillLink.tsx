import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

/** Rounded link with an arrow, for quick access to conversion pages. */
export default function PillLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium shadow-card transition hover:border-brand hover:text-brand"
    >
      {children}
      <ArrowRight
        aria-hidden="true"
        className="h-3.5 w-3.5 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand"
      />
    </Link>
  );
}
