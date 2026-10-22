"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { field } from "@/components/ui/styles";
import { TextPositionError, errorCode } from "@/lib/convert-error";
import { convertTimestamps, type TimestampUnit } from "@/lib/data/time";
import { MAX_UUIDS, generateUuids, type UuidVersion } from "@/lib/data/uuid";
import { trackTool } from "@/lib/stats-client";
import Checkbox from "../Checkbox";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import type { ShellOutput } from "../shell/state";

const textFile = (name: string, text: string, type = "text/plain"): ShellOutput => ({
  kind: "file",
  name,
  blob: new Blob([text], { type: `${type};charset=utf-8` }),
  preview: text,
});

export function UuidGeneratorTool() {
  const t = useTranslations("DataTools");
  const tt = useTranslations("Tools.uuid-generator");
  const countId = useId();
  const [version, setVersion] = useState<UuidVersion>("v4");
  const [count, setCount] = useState("1");
  const [upperCase, setUpperCase] = useState(false);
  const [hyphens, setHyphens] = useState(true);

  return (
    <ToolShell
      input={{ kind: "none" }}
      actionLabel={tt("action")}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("uuidVersion")}
            value={version}
            onChange={setVersion}
            options={[
              { value: "v4", label: t("uuidV4") },
              { value: "v7", label: t("uuidV7") },
            ]}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor={countId} className="text-sm font-medium">
              {t("uuidCount", { max: MAX_UUIDS })}
            </label>
            <input
              id={countId}
              type="number"
              min={1}
              max={MAX_UUIDS}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className={`h-10 w-32 ${field}`}
            />
          </div>
          <Checkbox checked={hyphens} onChange={setHyphens} label={t("uuidHyphens")} />
          <Checkbox checked={upperCase} onChange={setUpperCase} label={t("upperCase")} />
        </div>
      }
      process={async () => {
        const ids = await trackTool(
          "uuid-generator",
          { from: "txt", to: "txt", files: [] },
          async () => generateUuids({ version, count: Number(count), upperCase, hyphens }),
          (out) => out.length,
        );
        return [textFile(ids.length === 1 ? "uuid.txt" : "uuids.txt", `${ids.join("\n")}\n`)];
      }}
    />
  );
}

/** IANA zones the browser knows, with UTC first. */
function timeZones(): string[] {
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return ["UTC", ...zones.filter((z) => z !== "UTC")];
}

export function TimestampConverterTool() {
  const t = useTranslations("DataTools");
  const tt = useTranslations("Tools.timestamp-converter");
  const zoneId = useId();
  const zones = useMemo(timeZones, []);
  const [unit, setUnit] = useState<TimestampUnit>("auto");
  const [zone, setZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");

  return (
    <ToolShell
      input={{
        kind: "text",
        label: t("timestampInput"),
        placeholder: "1700000000\n1700000000000\n2023-11-14T22:13:20Z\n2023-11-14 19:13",
        maxLength: 1_000_000,
      }}
      actionLabel={tt("action")}
      options={
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            legend={t("timestampUnit")}
            value={unit}
            onChange={setUnit}
            options={[
              { value: "auto", label: t("unitAuto") },
              { value: "s", label: t("unitSeconds") },
              { value: "ms", label: t("unitMilliseconds") },
            ]}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor={zoneId} className="text-sm font-medium">
              {t("timeZone")}
            </label>
            <select id={zoneId} value={zone} onChange={(e) => setZone(e.target.value)} className={`h-10 max-w-sm ${field}`}>
              {(zones.includes(zone) ? zones : [zone, ...zones]).map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">{t("timeZoneHint")}</span>
          </div>
        </div>
      }
      process={async ({ text }) => {
        try {
          const csv = await trackTool(
            "timestamp-converter",
            { from: "txt", to: "csv", files: [new Blob([text])] },
            async () => convertTimestamps(text, unit, zone),
            (out) => out.length,
          );
          return [textFile("timestamps.csv", csv, "text/csv")];
        } catch (error) {
          const position = error instanceof TextPositionError ? error.position : undefined;
          return [{ kind: "error", name: "timestamps.csv", code: errorCode(error), ...(position ? { position } : {}) }];
        }
      }}
    />
  );
}
