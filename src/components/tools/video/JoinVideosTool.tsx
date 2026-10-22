"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { formatFromExtension, type FormatId } from "@/config/formats";
import { tools } from "@/config/tools";
import { formatTime } from "@/lib/audio/time";
import { InputFileError } from "@/lib/convert-error";
import { videoExtension, videoMime } from "@/lib/video/options";
import { trackTool } from "@/lib/stats-client";
import ChoiceGroup from "../ChoiceGroup";
import ToolShell from "../shell/ToolShell";
import { renameExtension, type ShellOutput } from "../shell/state";
import { withTimeLimit } from "../audio/shared";
import { VIDEO_EXTENSIONS, videoSupport, type VideoSupport } from "./shared";

const tool = tools["join-videos"];
const engine = () => import("@/lib/video/convert");

type Target = "mp4" | "webm";

/** Several videos, in the chosen order, → one MP4 or WebM, in the browser. */
export default function JoinVideosTool() {
  const ta = useTranslations("AudioTool");
  const t = useTranslations("JoinVideosTool");
  const tv = useTranslations("VideoTool");
  const tt = useTranslations("Tools.join-videos");
  const [target, setTarget] = useState<Target>("mp4");
  const [count, setCount] = useState(0);
  const [support, setSupport] = useState<VideoSupport>("checking");
  useEffect(() => {
    void videoSupport().then(setSupport);
  }, []);

  async function process(files: File[], signal: AbortSignal, onProgress: (p: number) => void): Promise<ShellOutput[]> {
    const first = files[0]!;
    try {
      const out = await trackTool(
        "join-videos",
        { from: (formatFromExtension(first.name) ?? "mp4") as FormatId, to: target, files },
        () => withTimeLimit(tool.limits.timeoutMs, signal, async (limited) => (await engine()).joinVideos(files, target, { signal: limited, onProgress })),
        (o) => o.data.length,
      );
      const name = renameExtension(first.name, videoExtension[target]).replace(/(\.[^.]+)$/, `-${ta("joinedSuffix")}$1`);
      return [
        {
          kind: "file",
          name,
          blob: new Blob([out.data as Uint8Array<ArrayBuffer>], { type: videoMime[target] }),
          message: { ok: true, text: `${ta("joined", { count: files.length, length: formatTime(out.duration) })} ${t("size", { width: out.width, height: out.height })}` },
        },
      ];
    } catch (error) {
      // Name the file that failed: the whole join has a single result.
      if (error instanceof InputFileError) return [{ kind: "error", name: files[error.index]?.name ?? first.name, code: error.code }];
      throw error;
    }
  }

  return (
    <ToolShell
      input={{ kind: "files", extensions: VIDEO_EXTENSIONS, multiple: true, reorderable: true, maxFileBytes: tool.limits.maxFileBytes, ready: count >= 2 }}
      actionLabel={tt("action")}
      onFilesChange={(files) => setCount(files.length)}
      process={({ files }, { signal, onProgress }) => process(files, signal, onProgress)}
      options={
        <div className="flex flex-col gap-4">
          {count < 2 && <p className="text-sm text-muted">{ta("joinNeedsTwo")}</p>}
          <ChoiceGroup legend={tv("target")} value={target} onChange={setTarget} options={(["mp4", "webm"] as const).map((f) => ({ value: f, label: tv(`targets.${f}`) }))} />
          <p className="text-sm text-muted">{t("note")}</p>
          {(support === "noH264" || support === "none") && (
            <p role="status" className="text-sm text-muted">
              {tv(support === "none" ? "noWebCodecs" : "noH264")}
            </p>
          )}
        </div>
      }
    />
  );
}
