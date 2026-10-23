"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formats, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import { asReadableText, urlDecode, urlEncode, type UrlScope } from "@/lib/data/base64";
import { decodeBase64Input, encodeBase64Input } from "@/lib/data/client";
import { detectFormat } from "@/lib/detect";
import { runBatch } from "@/lib/jobs";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell, { type ShellContext } from "../shell/ToolShell";
import { extensionOf, type ShellOutput } from "../shell/state";
import { runTextTool } from "./textTool";

export function Base64EncodeTool() {
  const t = useTranslations("DataTools");
  const tt = useTranslations("Tools.base64-encode");
  const [output, setOutput] = useState<"plain" | "dataUrl">("plain");
  const [wrap, setWrap] = useState(false);

  return (
    <ToolShell
      input={{
        kind: "files",
        extensions: [],
        multiple: true,
        allowEmpty: true,
        maxFileBytes: tools["base64-encode"].limits.maxFileBytes,
        paste: { label: t("pasteText"), placeholder: "Hola, mundo" },
      }}
      actionLabel={tt("action")}
      zipName="fileflect-base64.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("output")}
            value={output}
            onChange={setOutput}
            options={[
              { value: "plain", label: "Base64" },
              { value: "dataUrl", label: t("dataUrl") },
            ]}
          />
          {output === "plain" && <Checkbox checked={wrap} onChange={setWrap} label={t("wrap76")} />}
        </div>
      }
      process={(input, context) =>
        runTextTool(input, context, {
          tool: "base64-encode",
          from: (file) => (file ? "bin" : "txt"),
          to: "base64",
          pastedName: "text",
          // "photo.png" → "photo.png.txt": the original name stays readable.
          outputName: (name) => `${name}.txt`,
          convert: (source, job) =>
            encodeBase64Input(
              source,
              {
                wrap,
                dataUrlMime:
                  output === "dataUrl" ? (typeof source === "string" ? "text/plain;charset=utf-8" : source.type || "application/octet-stream") : undefined,
              },
              job,
            ),
        })
      }
    />
  );
}

/** Extension of decoded bytes: the data URL's type, then the content, then text or raw. */
function decodedFormat(bytes: Uint8Array, mime: string | undefined, text: string | null): string {
  const byMime = mime && (Object.values(formats).find((f) => f.mime === mime && f.id !== "base64")?.id as FormatId | undefined);
  if (byMime) return formats[byMime].extensions[0]!;
  const detected = detectFormat(bytes.subarray(0, 64 * 1024));
  if (detected && detected !== "txt") return formats[detected].extensions[0]!;
  return text !== null ? "txt" : "bin";
}

function decodedName(inputName: string, extension: string): string {
  const base = ["txt", "b64", "base64"].includes(extensionOf(inputName)) ? inputName.slice(0, inputName.lastIndexOf(".")) : inputName;
  // "photo.png.txt" decodes back to "photo.png".
  return extensionOf(base) === extension ? base : `${base}.${extension}`;
}

async function decodeAll({ files, text }: { files: File[]; text: string }, { signal, onProgress }: ShellContext): Promise<ShellOutput[]> {
  const inputs: (File | null)[] = files.length > 0 ? files : [null];
  const results = await runBatch(
    inputs,
    (file, job) =>
      trackTool(
        "base64-decode",
        { from: "base64", to: "bin", files: [file ?? new Blob([text])] },
        () => decodeBase64Input(file ?? text, { signal: job.signal, onProgress: job.onProgress }),
        (out) => out.bytes.length,
      ),
    { signal, onProgress },
  );
  return results.map((result, i): ShellOutput => {
    const inputName = inputs[i]?.name ?? "decoded";
    if (result.status === "error") return { kind: "error", name: inputName, code: result.code };
    const { bytes, mime } = result.value;
    const readable = asReadableText(bytes);
    const extension = decodedFormat(bytes, mime, readable);
    const type = mime ?? Object.values(formats).find((f) => f.extensions[0] === extension)?.mime ?? "application/octet-stream";
    return {
      kind: "file",
      name: decodedName(inputName, extension),
      blob: new Blob([bytes.slice().buffer], { type }),
      ...(readable !== null ? { preview: readable } : {}),
    };
  });
}

export function Base64DecodeTool() {
  const t = useTranslations("DataTools");
  const tt = useTranslations("Tools.base64-decode");
  return (
    <ToolShell
      input={{
        kind: "files",
        extensions: ["txt", "b64", "base64"],
        multiple: true,
        maxFileBytes: tools["base64-decode"].limits.maxFileBytes,
        paste: { label: t("paste", { format: "Base64" }), placeholder: "SG9sYSwgbXVuZG8= / data:image/png;base64,…" },
      }}
      actionLabel={tt("action")}
      zipName="fileflect-decoded.zip"
      process={decodeAll}
    />
  );
}

export function UrlEncodeTool() {
  const t = useTranslations("DataTools");
  const tt = useTranslations("Tools.url-encode");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [scope, setScope] = useState<UrlScope>("component");
  const [plusIsSpace, setPlusIsSpace] = useState(true);

  return (
    <ToolShell
      input={{ kind: "text", label: t("pasteText"), placeholder: "https://example.com/búsqueda?q=café con leche", maxLength: 5_000_000 }}
      actionLabel={mode === "encode" ? tt("action") : t("decodeAction")}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("mode")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "encode", label: t("encode") },
              { value: "decode", label: t("decode") },
            ]}
          />
          {mode === "encode" ? (
            <ChoiceGroup
              legend={t("scope")}
              value={scope}
              onChange={setScope}
              options={[
                { value: "component", label: t("scopeComponent") },
                { value: "url", label: t("scopeUrl") },
              ]}
            />
          ) : (
            <Checkbox checked={plusIsSpace} onChange={setPlusIsSpace} label={t("plusIsSpace")} />
          )}
        </div>
      }
      process={async ({ text }) => {
        const result = await trackTool(
          "url-encode",
          { from: "txt", to: "txt", files: [new Blob([text])] },
          async () => (mode === "encode" ? urlEncode(text, scope) : urlDecode(text, plusIsSpace)),
          (out) => out.length,
        );
        return [{ kind: "file", name: mode === "encode" ? "url-encoded.txt" : "url-decoded.txt", blob: new Blob([result], { type: "text/plain;charset=utf-8" }), preview: result }];
      }}
    />
  );
}
