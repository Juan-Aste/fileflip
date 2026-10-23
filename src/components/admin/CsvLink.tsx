"use client";

import { useRef, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { saveBlob } from "@/lib/download";

type Props = {
  href: string;
  /** Name of the table, for screen readers. */
  title: string;
  busyLabel: string;
  errorLabel: string;
};

/** `attachment; filename="x.csv"` → x.csv */
function filenameFrom(disposition: string | null) {
  return disposition?.match(/filename="([^"]+)"/)?.[1] ?? "fileflect.csv";
}

/**
 * The CSV download of a panel table. Fetched instead of a plain `download`
 * link, which saved the API's JSON error as the file when MongoDB was down,
 * with nothing shown in the panel (B-12).
 */
export default function CsvLink({ href, title, busyLabel, errorLabel }: Props) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const busy = useRef(false);

  async function download(event: React.MouseEvent<HTMLAnchorElement>) {
    // Modified clicks (new tab, save link) keep the browser's behavior.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setState("busy");
    try {
      const res = await fetch(href, { signal: AbortSignal.timeout(60_000) });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.startsWith("text/csv")) throw new Error(`HTTP ${res.status}`);
      saveBlob(await res.blob(), filenameFrom(res.headers.get("content-disposition")));
      setState("idle");
    } catch {
      setState("error");
    } finally {
      busy.current = false;
    }
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <a
        href={href}
        download
        onClick={download}
        aria-busy={state === "busy"}
        className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
      >
        {state === "busy" ? (
          <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
        ) : (
          <Download aria-hidden="true" className="size-4" />
        )}
        {state === "busy" ? busyLabel : "CSV"}
        <span className="sr-only">: {title}</span>
      </a>
      <span role="alert" className="text-sm text-danger">
        {state === "error" ? errorLabel : ""}
      </span>
    </span>
  );
}
