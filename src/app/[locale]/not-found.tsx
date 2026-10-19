import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("Errors");
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">{t("notFoundTitle")}</h1>
      <p className="text-muted">{t("notFoundBody")}</p>
      <Link
        href="/"
        className="rounded-lg bg-brand-solid px-4 py-2 font-medium text-white hover:bg-brand-solid-hover"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
