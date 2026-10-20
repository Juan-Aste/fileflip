import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonPrimary } from "@/components/ui/styles";

export default function NotFound() {
  const t = useTranslations("Errors");
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">{t("notFoundTitle")}</h1>
      <p className="text-muted">{t("notFoundBody")}</p>
      <Link
        href="/"
        className={buttonPrimary}
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
