// Shared class names for the base UI pieces (see docs/design.md). Layout
// classes (self-start, w-full, margins) are added where each one is used.

const buttonBase =
  "inline-flex items-center justify-center gap-2 font-semibold transition duration-150 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

export const buttonPrimary = `${buttonBase} rounded-xl bg-brand-solid px-6 py-3 text-white shadow-card hover:bg-brand-solid-hover hover:shadow-lift`;

export const buttonPrimarySmall = `${buttonBase} rounded-lg bg-brand-solid px-3 py-1.5 text-sm text-white hover:bg-brand-solid-hover`;

export const buttonSecondary = `${buttonBase} rounded-xl border border-border-strong bg-surface px-5 py-2.5 text-foreground hover:border-brand hover:text-brand`;

export const buttonDanger = `${buttonBase} rounded-xl border border-danger/40 px-5 py-2.5 text-sm text-danger hover:bg-danger-soft`;

/** Text inputs and selects; set the height where used (h-9 / h-10 / h-11). */
export const field =
  "rounded-xl border border-border-strong bg-surface px-3 text-foreground transition duration-150 hover:border-brand/60 focus-visible:border-brand aria-invalid:border-danger";

/** Pill drawn after a visually hidden radio (`peer sr-only`). */
export const choicePill =
  "block cursor-pointer rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm font-semibold transition duration-150 hover:border-brand peer-checked:border-brand-solid peer-checked:bg-brand-solid peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring";

export const card = "rounded-2xl border border-border bg-surface shadow-card";

export const badge =
  "inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand";
