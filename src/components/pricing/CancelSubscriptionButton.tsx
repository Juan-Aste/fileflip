"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoaderCircle } from "lucide-react";
import { buttonDanger } from "@/components/ui/styles";
import type { ApiErrorCode } from "@/lib/api-errors";
import { postAction } from "@/lib/post-action";

export default function CancelSubscriptionButton() {
  const t = useTranslations("Account");
  const te = useTranslations("ApiErrors");
  const tu = useTranslations("ToolUi");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiErrorCode | null>(null);
  const inFlight = useRef(false);

  async function cancel() {
    if (inFlight.current || !window.confirm(t("cancelConfirm"))) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const result = await postAction("/api/billing/cancel");
    inFlight.current = false;
    setBusy(false);
    if (result.ok) router.refresh();
    else setError(result.code);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        aria-busy={busy}
        className={`self-start ${buttonDanger}`}
      >
        {busy && <LoaderCircle aria-hidden="true" className="h-5 w-5 motion-safe:animate-spin" />}
        {busy ? tu("working") : t("cancel")}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {te(error)}
        </p>
      )}
    </div>
  );
}
