"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { field } from "@/components/ui/styles";
import { tools, type ToolId } from "@/config/tools";
import { runBatch } from "@/lib/jobs";
import { protectPdfFile, unlockPdfFile } from "@/lib/pdf/client";
import { MAX_PASSWORD_LENGTH, type Permissions } from "@/lib/pdf/password";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "./Checkbox";
import ToolShell from "./shell/ToolShell";
import type { ShellOutput } from "./shell/state";

const baseName = (name: string) => name.replace(/\.pdf$/i, "") || "document";

function PasswordField({
  label,
  value,
  onChange,
  visible,
  invalid,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  invalid?: boolean;
  autoComplete: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={MAX_PASSWORD_LENGTH}
        autoComplete={autoComplete}
        spellCheck={false}
        aria-invalid={invalid || undefined}
        className={`h-10 ${field}`}
      />
    </div>
  );
}

function ShowToggle({ visible, onChange }: { visible: boolean; onChange: (v: boolean) => void }) {
  const t = useTranslations("PdfTools");
  return (
    <button
      type="button"
      onClick={() => onChange(!visible)}
      aria-pressed={visible}
      className="inline-flex w-fit items-center gap-1.5 rounded text-sm text-brand underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {visible ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
      {t("showPassword")}
    </button>
  );
}

/** Runs one password operation over every picked PDF. */
function passwordBatch(tool: ToolId, suffix: string, run: (file: File, signal?: AbortSignal) => Promise<Blob>) {
  return async ({ files }: { files: File[] }, { signal, onProgress }: { signal: AbortSignal; onProgress: (p: number) => void }) => {
    const results = await runBatch(
      files,
      (file, job) => trackTool(tool, { from: "pdf", to: "pdf", files: [file] }, () => run(file, job.signal), (b) => b.size),
      { signal, onProgress },
    );
    return results.map((result, i): ShellOutput => {
      const name = `${baseName(files[i]!.name)}-${suffix}.pdf`;
      return result.status === "error" ? { kind: "error", name, code: result.code } : { kind: "file", name, blob: result.value };
    });
  };
}

export function ProtectPdfTool() {
  const t = useTranslations("PdfTools");
  const tt = useTranslations("Tools.protect-pdf");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [permissions, setPermissions] = useState<Permissions>({ print: true, copy: true, modify: true });
  const mismatch = confirm !== "" && confirm !== password;
  const permission = (key: keyof Permissions) => (
    <Checkbox
      checked={permissions[key]}
      onChange={(v) => setPermissions((prev) => ({ ...prev, [key]: v }))}
      label={t(`permissions.${key}`)}
    />
  );

  return (
    <ToolShell
      input={{ kind: "files", extensions: ["pdf"], multiple: true, maxFileBytes: tools["protect-pdf"].limits.maxFileBytes, ready: password !== "" && confirm === password }}
      actionLabel={tt("action")}
      zipName="fileflect-protected.zip"
      options={
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <PasswordField label={t("password")} value={password} onChange={setPassword} visible={visible} autoComplete="new-password" />
            <PasswordField
              label={t("confirmPassword")}
              value={confirm}
              onChange={setConfirm}
              visible={visible}
              invalid={mismatch}
              autoComplete="new-password"
            />
          </div>
          <ShowToggle visible={visible} onChange={setVisible} />
          {mismatch && (
            <p role="alert" className="text-xs text-danger">
              {t("passwordMismatch")}
            </p>
          )}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">{t("permissionsLegend")}</legend>
            {permission("print")}
            {permission("copy")}
            {permission("modify")}
          </fieldset>
          <p className="text-sm text-muted">{t("protectNote")}</p>
        </div>
      }
      process={passwordBatch("protect-pdf", "protected", (file, signal) => protectPdfFile(file, password, permissions, { signal }))}
    />
  );
}

export function UnlockPdfTool() {
  const t = useTranslations("PdfTools");
  const tt = useTranslations("Tools.unlock-pdf");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);

  return (
    <ToolShell
      input={{ kind: "files", extensions: ["pdf"], multiple: true, maxFileBytes: tools["unlock-pdf"].limits.maxFileBytes, ready: password !== "" }}
      actionLabel={tt("action")}
      zipName="fileflect-unlocked.zip"
      options={
        <div className="flex flex-col gap-3">
          <PasswordField label={t("currentPassword")} value={password} onChange={setPassword} visible={visible} autoComplete="off" />
          <ShowToggle visible={visible} onChange={setVisible} />
          <p className="text-sm text-muted">{t("unlockNote")}</p>
        </div>
      }
      process={passwordBatch("unlock-pdf", "unlocked", (file, signal) => unlockPdfFile(file, password, { signal }))}
    />
  );
}
