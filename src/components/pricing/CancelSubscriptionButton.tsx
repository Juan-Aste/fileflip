"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { buttonDanger } from "@/components/ui/styles";

export default function CancelSubscriptionButton() {
  const t = useTranslations("Account");
  const te = useTranslations("ApiErrors");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function cancel() {
    if (!window.confirm(t("cancelConfirm"))) return;
    setBusy(true);
    setFailed(false);
    const res = await fetch("/api/billing/cancel", { method: "POST" }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
    else setFailed(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className={`self-start ${buttonDanger}`}
      >
        {t("cancel")}
      </button>
      {failed && (
        <p role="alert" className="text-sm text-danger">
          {te("serviceUnavailable")}
        </p>
      )}
    </div>
  );
}
