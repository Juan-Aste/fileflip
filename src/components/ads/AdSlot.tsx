"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";
import { useSessionInfo } from "@/components/session/SessionInfo";
import { adMode } from "./ad-mode";

export type AdPlacement = "sidebar" | "result";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const SLOTS: Record<AdPlacement, string | undefined> = {
  sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR,
  result: process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT,
};

const sizes: Record<AdPlacement, string> = {
  sidebar: "min-h-[600px] w-[300px]",
  result: "min-h-[100px] w-full",
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * A discreet, clearly labelled ad. Rules: no pop-ups or interstitials, never
 * next to or looking like a download button, never for Pro users.
 */
export default function AdSlot({ placement, className = "" }: { placement: AdPlacement; className?: string }) {
  const t = useTranslations("Ads");
  const { plan, loaded } = useSessionInfo();
  const mode = adMode({ client: CLIENT, plan, loaded });
  const pushed = useRef(false);

  useEffect(() => {
    if (mode !== "ad" || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Blocked by an ad blocker: fine.
    }
  }, [mode]);

  if (mode === "hidden") return null;

  if (mode === "reserved") {
    // Same box as the ad (label + slot) so nothing shifts when it fills in.
    return (
      <div aria-hidden="true" className={`flex flex-col items-center gap-1 ${className}`}>
        <span className="invisible text-[11px]">{t("label")}</span>
        <div className={sizes[placement]} />
      </div>
    );
  }

  return (
    <aside aria-label={t("label")} className={`flex flex-col items-center gap-1 ${className}`}>
      <span className="text-[11px] uppercase tracking-wide text-muted">{t("label")}</span>
      {mode === "placeholder" ? (
        <div
          className={`grid place-items-center rounded-xl border border-dashed border-border text-xs text-muted ${sizes[placement]}`}
        >
          {t("placeholder")}
        </div>
      ) : (
        <>
          <Script
            id="adsense"
            async
            strategy="lazyOnload"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`}
          />
          <ins
            className={`adsbygoogle block ${sizes[placement]}`}
            data-ad-client={CLIENT}
            data-ad-slot={SLOTS[placement]}
            data-ad-format={placement === "sidebar" ? "vertical" : "horizontal"}
            data-full-width-responsive="true"
          />
        </>
      )}
    </aside>
  );
}
