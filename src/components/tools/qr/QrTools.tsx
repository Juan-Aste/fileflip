"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import { formatFromExtension } from "@/config/formats";
import { tools } from "@/config/tools";
import { ConversionError } from "@/lib/convert-error";
import { readQrImage } from "@/lib/qr/client";
import {
  contactPayload,
  contrastRatio,
  qrMatrix,
  qrPixels,
  qrSvg,
  wifiPayload,
  type Contact,
  type ErrorCorrection,
  type WifiNetwork,
} from "@/lib/qr/qr";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import { runTextTool } from "../data/textTool";
import ToolShell from "../shell/ToolShell";
import type { ShellOutput } from "../shell/state";

function Field({ label, value, onChange, type = "text", multiline = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  multiline?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {multiline ? (
        <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={4} className={`min-h-24 py-2 ${field}`} />
      ) : (
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" className={`h-10 ${field}`} />
      )}
    </div>
  );
}

type Content = "text" | "wifi" | "contact";

const emptyContact: Contact = { firstName: "", lastName: "", phone: "", email: "", organization: "", url: "" };

async function pngBlob(pixels: { width: number; height: number; data: Uint8ClampedArray }): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ConversionError("browserUnsupported");
  ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height), 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new ConversionError("browserUnsupported"))), "image/png"),
  );
}

export function QrGeneratorTool() {
  const t = useTranslations("QrTools");
  const tt = useTranslations("Tools.qr-generator");
  const [content, setContent] = useState<Content>("text");
  const [text, setText] = useState("");
  const [wifi, setWifi] = useState<WifiNetwork>({ ssid: "", password: "", security: "WPA", hidden: false });
  const [contact, setContact] = useState<Contact>(emptyContact);
  const [format, setFormat] = useState<"png" | "svg">("png");
  const [size, setSize] = useState<"256" | "512" | "1024" | "2048">("1024");
  const [level, setLevel] = useState<ErrorCorrection>("M");
  const [dark, setDark] = useState("#000000");
  const [light, setLight] = useState("#ffffff");
  const [transparent, setTransparent] = useState(false);

  const payload =
    content === "text"
      ? text
      : content === "wifi"
        ? wifi.ssid.trim()
          ? wifiPayload(wifi)
          : ""
        : [contact.firstName, contact.lastName, contact.phone, contact.email].some((v) => v.trim())
          ? contactPayload(contact)
          : "";
  // Scanners need a dark code on a light background with enough contrast.
  const lowContrast = !transparent && contrastRatio(dark, light) < 3;
  const setContactField = (key: keyof Contact) => (value: string) => setContact((c) => ({ ...c, [key]: value }));

  async function process(): Promise<ShellOutput[]> {
    const style = { dark, light: transparent ? "transparent" : light };
    const blob = await trackTool(
      "qr-generator",
      { from: "txt", to: format, files: [new Blob([payload])] },
      async () => {
        const matrix = qrMatrix(payload, level);
        return format === "svg"
          ? new Blob([qrSvg(matrix, style)], { type: "image/svg+xml" })
          : pngBlob(qrPixels(matrix, style, Number(size)));
      },
      (out) => out.size,
    );
    return [{ kind: "file", name: `qr.${format}`, blob }];
  }

  return (
    <ToolShell
      input={{ kind: "none", ready: payload.trim() !== "" }}
      actionLabel={tt("action")}
      zipName="fileflect-qr.zip"
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("content")}
            value={content}
            onChange={setContent}
            options={[
              { value: "text", label: t("contentText") },
              { value: "wifi", label: t("contentWifi") },
              { value: "contact", label: t("contentContact") },
            ]}
          />
          {content === "text" && <Field label={t("text")} value={text} onChange={setText} multiline />}
          {content === "wifi" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("ssid")} value={wifi.ssid} onChange={(ssid) => setWifi((w) => ({ ...w, ssid }))} />
              {wifi.security !== "nopass" && (
                <Field label={t("password")} value={wifi.password} onChange={(password) => setWifi((w) => ({ ...w, password }))} />
              )}
              <div className="sm:col-span-2">
                <ChoiceGroup
                  legend={t("security")}
                  value={wifi.security}
                  onChange={(security) => setWifi((w) => ({ ...w, security }))}
                  options={[
                    { value: "WPA", label: "WPA/WPA2/WPA3" },
                    { value: "WEP", label: "WEP" },
                    { value: "nopass", label: t("noPassword") },
                  ]}
                />
              </div>
              <Checkbox checked={wifi.hidden} onChange={(hidden) => setWifi((w) => ({ ...w, hidden }))} label={t("hidden")} />
            </div>
          )}
          {content === "contact" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("firstName")} value={contact.firstName} onChange={setContactField("firstName")} />
              <Field label={t("lastName")} value={contact.lastName} onChange={setContactField("lastName")} />
              <Field label={t("phone")} type="tel" value={contact.phone} onChange={setContactField("phone")} />
              <Field label={t("email")} type="email" value={contact.email} onChange={setContactField("email")} />
              <Field label={t("organization")} value={contact.organization} onChange={setContactField("organization")} />
              <Field label={t("website")} type="url" value={contact.url} onChange={setContactField("url")} />
            </div>
          )}
          <ChoiceGroup
            legend={t("format")}
            value={format}
            onChange={setFormat}
            options={[
              { value: "png", label: "PNG" },
              { value: "svg", label: t("svgLabel") },
            ]}
          />
          {format === "png" && (
            <ChoiceGroup
              legend={t("size")}
              value={size}
              onChange={setSize}
              options={(["256", "512", "1024", "2048"] as const).map((s) => ({ value: s, label: `${s} px` }))}
            />
          )}
          <ChoiceGroup
            legend={t("correction")}
            value={level}
            onChange={setLevel}
            options={[
              { value: "L", label: t("correctionL") },
              { value: "M", label: t("correctionM") },
              { value: "Q", label: t("correctionQ") },
              { value: "H", label: t("correctionH") },
            ]}
          />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="color" value={dark} onChange={(e) => setDark(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border bg-surface" />
              {t("darkColor")}
            </label>
            {!transparent && (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="color" value={light} onChange={(e) => setLight(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border bg-surface" />
                {t("lightColor")}
              </label>
            )}
            <Checkbox checked={transparent} onChange={setTransparent} label={t("transparent")} />
          </div>
          {lowContrast && <p className="text-sm font-medium text-danger">{t("lowContrast")}</p>}
        </div>
      }
      process={process}
    />
  );
}

const readable = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif"];

export function QrReaderTool() {
  const tt = useTranslations("Tools.qr-reader");
  return (
    <ToolShell
      input={{ kind: "files", extensions: readable, multiple: true, maxFileBytes: tools["qr-reader"].limits.maxFileBytes }}
      actionLabel={tt("action")}
      zipName="fileflect-qr-text.zip"
      process={(input, context) =>
        runTextTool(input, context, {
          tool: "qr-reader",
          from: (file) => (file && formatFromExtension(file.name)) || "png",
          to: "txt",
          pastedName: "qr",
          convert: (source, job) => readQrImage(source as Blob, job),
        })
      }
    />
  );
}
