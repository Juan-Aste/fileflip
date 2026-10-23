"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

/** Submit button that shows a spinner and can't be pressed again while its form's action runs. */
export default function PendingSubmitButton({
  icon,
  pendingLabel,
  className,
  children,
}: {
  icon: React.ReactNode;
  pendingLabel: string;
  className: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? <LoaderCircle aria-hidden="true" className="h-5 w-5 motion-safe:animate-spin" /> : icon}
      {pending ? pendingLabel : children}
    </button>
  );
}
