"use client";

import { useTranslations } from "next-intl";
import { Grid2x2X } from "lucide-react";
import { formats, type FormatId } from "@/config/formats";
import { fakeBgOutput } from "@/lib/image/fake-bg-shared";
import { buttonPrimarySmall } from "@/components/ui/styles";

interface Props {
  /** The output format the user picked (null when none yet). */
  picked: FormatId | null | undefined;
  onFix: () => void;
  busy?: boolean;
}

/**
 * Shown when a picture has the grey/white "transparency" checkerboard drawn
 * into its pixels: explains it and offers to turn it into real transparency.
 */
export default function FakeBgNotice({ picked, onFix, busy }: Props) {
  const t = useTranslations("FakeTransparency");
  const to = fakeBgOutput(picked);
  const noAlpha = picked && picked !== to;
  return (
    <div role="status" className="flex animate-rise flex-col gap-2 rounded-xl border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning" data-testid="fake-bg-notice">
      <p className="flex items-start gap-2 font-semibold">
        <Grid2x2X aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        {t("title")}
      </p>
      <p>{t("help", { to: formats[to].label })}</p>
      {noAlpha && <p>{t("noAlpha", { format: formats[picked].label })}</p>}
      <button type="button" onClick={onFix} disabled={busy} className={`${buttonPrimarySmall} min-h-11 self-start sm:min-h-0`}>
        {t("action")}
      </button>
    </div>
  );
}
