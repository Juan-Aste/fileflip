import "server-only";
import { conversionFromSlug } from "@/config/conversion-pages";
import { toolFromSlug } from "@/config/tools";
import { longtailFromSlug } from "@/content/longtail";
import { routing, type Locale } from "@/i18n/routing";
import { connectToDatabase } from "@/lib/db";
import { PageView, type PageKind } from "@/models/PageView";

export interface Visit {
  locale: Locale;
  kind: PageKind;
  page?: string;
  country?: string;
}

const fixedPages: Record<string, PageKind> = {
  "": "home",
  pricing: "pricing",
  privacy: "legal",
  terms: "legal",
  contact: "legal",
  account: "account",
  login: "account",
};

/**
 * Turns a pathname into a visit (language + which page), or null for paths
 * that are not counted (admin, unknown locale). The page id does not depend
 * on the language, so "/es/jpg-a-webp" and "/en/jpg-to-webp" count together.
 */
export function classifyPath(pathname: unknown): Omit<Visit, "country"> | null {
  if (typeof pathname !== "string" || pathname.length > 300) return null;
  const [, locale = "", ...rest] = pathname.split("?")[0].split("/");
  if (!(routing.locales as readonly string[]).includes(locale)) return null;
  const loc = locale as Locale;
  const first = rest[0] ?? "";
  if (first === "admin") return null;
  if (rest.length <= 1 && first in fixedPages) return { locale: loc, kind: fixedPages[first] };
  if (rest[0] === "login") return { locale: loc, kind: "account" };
  if (rest.length === 1) {
    let slug = first;
    try {
      slug = decodeURIComponent(first);
    } catch {
      return { locale: loc, kind: "other" };
    }
    const conversion = conversionFromSlug(loc, slug);
    if (conversion) return { locale: loc, kind: "conversion", page: `${conversion.from}-${conversion.to}` };
    const tool = toolFromSlug(loc, slug);
    if (tool) return { locale: loc, kind: "tool", page: tool.id };
    const longtail = longtailFromSlug(loc, slug);
    if (longtail) return { locale: loc, kind: "longtail", page: longtail.id };
  }
  return { locale: loc, kind: "other" };
}

/** Stores a visit. Never throws: stats must not break pages. */
export async function logVisit(visit: Visit): Promise<void> {
  if (!process.env.MONGODB_URI) return;
  try {
    await connectToDatabase();
    await PageView.create(visit);
  } catch (error) {
    console.warn("Could not log visit", error);
  }
}
