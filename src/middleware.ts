import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { foreignSlugRedirect, unprefixedRedirect } from "./config/known-pages";
import { locales, routing, type Locale } from "./i18n/routing";

const intl = createMiddleware(routing);

function permanent(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = encodeURI(path);
  return NextResponse.redirect(url, 301);
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/");
  const first = segments[1];
  if ((locales as readonly string[]).includes(first)) {
    // A slug of another language under this prefix (/es/merge-pdf → /es/unir-pdf).
    const rest = pathname.slice(first.length + 1);
    if (rest.length > 1) {
      const target = foreignSlugRedirect(first as Locale, rest);
      if (target) return permanent(request, target);
    }
  } else if (pathname !== "/") {
    // No prefix: the slug's own language (/csv-to-pdf → /en/csv-to-pdf), with
    // one permanent redirect. Anything else keeps next-intl's detection.
    const target = unprefixedRedirect(pathname);
    if (target) return permanent(request, target);
  }
  return intl(request);
}

export const config = {
  // Skip API routes, Next.js internals and files with an extension (static assets).
  matcher: "/((?!api|_next|.*\\..*).*)",
};
