"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ChoiceGroup from "./ChoiceGroup";
import ToolShell from "./shell/ToolShell";
import { runServerBatch } from "./shell/serverBatch";

const standards = ["PDF/A-1b", "PDF/A-2b", "PDF/A-3b"] as const;

/** "acta.pdf" → "acta-pdfa.pdf" (same as the API's file name). */
const pdfaName = (name: string) => `${name.replace(/\.pdf$/i, "") || "document"}-pdfa.pdf`;

/** PDF → PDF/A on our server (Gotenberg). */
export default function PdfaTool() {
  const t = useTranslations("PdfaTool");
  const tt = useTranslations("Tools.pdf-to-pdfa");
  const [standard, setStandard] = useState<(typeof standards)[number]>("PDF/A-2b");
  return (
    <ToolShell
      engine="server"
      input={{ kind: "files", extensions: ["pdf"], multiple: true }}
      actionLabel={tt("action")}
      zipName="fileflect-pdfa.zip"
      options={
        <div className="flex flex-col gap-3">
          <ChoiceGroup legend={t("standard")} value={standard} onChange={setStandard} options={standards.map((s) => ({ value: s, label: s }))} />
          <p className="text-sm text-muted">{t(`hint_${standard.slice(6)}`)}</p>
        </div>
      }
      process={({ files }, context) =>
        runServerBatch(files, context, {
          tool: "pdf-to-pdfa",
          endpoint: "/api/convert/pdfa",
          from: "pdf",
          to: "pdf",
          options: { standard },
          outputName: pdfaName,
        })
      }
    />
  );
}
