import type { ReactNode } from "react";

/** Centered page heading used by tool, conversion and long-tail pages. */
export default function PageHero({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: ReactNode;
  /** Description and badges under the title. */
  children?: ReactNode;
}) {
  return (
    <header className="relative isolate flex flex-col items-center gap-4 text-center">
      {/* Soft brand glow, as on the home page; purely decorative. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-12 -z-10 h-72 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,var(--brand-soft),transparent_70%)]"
      />
      {icon && (
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-solid text-white shadow-lift">
          {icon}
        </span>
      )}
      <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">{title}</h1>
      {children}
    </header>
  );
}
