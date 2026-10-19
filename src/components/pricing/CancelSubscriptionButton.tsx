"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
        className="self-start rounded-xl border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
      >
        {t("cancel")}
      </button>
      {failed && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {te("serviceUnavailable")}
        </p>
      )}
    </div>
  );
}
