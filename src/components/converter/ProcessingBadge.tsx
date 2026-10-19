import { useTranslations } from "next-intl";
import type { Engine } from "@/config/formats";

const styles: Record<Engine, string> = {
  browser:
    "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  server:
    "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
};

/** Tells users where their file is processed: the core privacy promise. */
export default function ProcessingBadge({ engine }: { engine: Engine }) {
  const t = useTranslations("ProcessingBadge");
  return (
    <p
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ${styles[engine]}`}
    >
      <span aria-hidden="true">{engine === "browser" ? "🔒" : "☁️"}</span>
      {t(engine)}
    </p>
  );
}
