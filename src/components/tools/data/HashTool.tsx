"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import { checksumLines, hashAlgorithms, matchExpected, type HashAlgorithm } from "@/lib/data/hash";
import { hashFileInput } from "@/lib/data/client";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ToolShell, { type ShellContext } from "../shell/ToolShell";
import type { ShellOutput } from "../shell/state";

const displayNames: Record<HashAlgorithm, string> = { md5: "MD5", sha1: "SHA-1", sha256: "SHA-256", sha512: "SHA-512" };

export default function HashTool() {
  const t = useTranslations("DataTools");
  const tt = useTranslations("Tools.hash-generator");
  const expectedId = useId();
  const [algorithms, setAlgorithms] = useState<HashAlgorithm[]>([...hashAlgorithms]);
  const [upperCase, setUpperCase] = useState(false);
  const [expected, setExpected] = useState("");

  const toggle = (algorithm: HashAlgorithm, on: boolean) =>
    setAlgorithms((current) => hashAlgorithms.filter((a) => (a === algorithm ? on : current.includes(a))));

  async function process({ files, text }: { files: File[]; text: string }, { signal, onProgress }: ShellContext): Promise<ShellOutput[]> {
    const inputs: (File | null)[] = files.length > 0 ? files : [null];
    const chosen = algorithms.length > 0 ? algorithms : (["sha256"] as HashAlgorithm[]);
    const results = await runBatch(
      inputs,
      (file, job) =>
        trackTool(
          "hash-generator",
          { from: file ? "bin" : "txt", to: "txt", files: [file ?? new Blob([text])] },
          () => hashFileInput(file ?? text, chosen, { signal: job.signal, onProgress: job.onProgress }),
          (digests) => Object.values(digests).join("").length,
        ),
      { signal, onProgress },
    );

    const outputs: ShellOutput[] = [];
    const lines: string[] = [];
    const verdicts: { name: string; algorithm: HashAlgorithm; matches: boolean }[] = [];
    results.forEach((result, i) => {
      const name = inputs[i]?.name ?? "text";
      if (result.status === "error") {
        outputs.push({ kind: "error", name, code: result.code });
        return;
      }
      lines.push(...checksumLines(name, result.value, upperCase));
      const match = matchExpected(expected, result.value);
      if (match) verdicts.push({ name, ...match });
    });
    if (lines.length === 0) return outputs;

    const report = `${lines.join("\n")}\n`;
    const matched = verdicts.filter((v) => v.matches);
    const message =
      expected.trim() === ""
        ? undefined
        : matched.length > 0
          ? { ok: true, text: t("hashMatches", { algorithm: displayNames[matched[0]!.algorithm], name: matched[0]!.name }) }
          : { ok: false, text: verdicts.length > 0 ? t("hashMismatch") : t("hashNotComparable") };
    return [
      { kind: "file", name: "checksums.txt", blob: new Blob([report], { type: "text/plain;charset=utf-8" }), preview: report, ...(message ? { message } : {}) },
      ...outputs,
    ];
  }

  return (
    <ToolShell
      input={{
        kind: "files",
        extensions: [],
        multiple: true,
        paste: { label: t("pasteText"), placeholder: "Hola, mundo" },
      }}
      actionLabel={tt("action")}
      options={
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">{t("algorithms")}</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {hashAlgorithms.map((a) => (
                <Checkbox key={a} checked={algorithms.includes(a)} onChange={(on) => toggle(a, on)} label={displayNames[a]} />
              ))}
            </div>
          </fieldset>
          <Checkbox checked={upperCase} onChange={setUpperCase} label={t("upperCase")} />
          <div className="flex flex-col gap-1">
            <label htmlFor={expectedId} className="text-sm font-medium">
              {t("expectedHash")}
            </label>
            <input
              id={expectedId}
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              placeholder="e3b0c44298fc1c149afbf4c8996fb924…"
              aria-describedby={`${expectedId}-hint`}
              spellCheck={false}
              autoComplete="off"
              className={`h-10 font-mono ${field}`}
            />
            <span id={`${expectedId}-hint`} className="text-xs text-muted">
              {t("expectedHashHint")}
            </span>
          </div>
        </div>
      }
      process={process}
    />
  );
}
