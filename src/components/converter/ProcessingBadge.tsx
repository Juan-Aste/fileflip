import { useTranslations } from "next-intl";
import type { Engine } from "@/config/formats";

const styles: Record<Engine, string> = {
  browser:
    "bg-success-soft text-success ring-success/30",
  server:
    "bg-warning-soft text-warning ring-warning/30",
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
