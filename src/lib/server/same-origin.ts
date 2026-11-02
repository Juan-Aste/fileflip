import "server-only";

/**
 * True when the request comes from a page of this site (task 13.3b): another
 * site can't spend our cloud quota from its visitors' browsers. Browsers
 * always send Origin on a fetch POST and, today, Sec-Fetch-Site. A script
 * outside a browser can fake both; the limits by IP and by month cover that.
 */
export function isSameOrigin(request: Request, siteUrl = process.env.NEXT_PUBLIC_SITE_URL): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const allowed = new Set<string>();
  const requestHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (requestHost) allowed.add(requestHost.split(",")[0].trim());
  if (siteUrl) {
    try {
      allowed.add(new URL(siteUrl).host);
    } catch {
      // Ignore a malformed NEXT_PUBLIC_SITE_URL.
    }
  }
  return allowed.has(host);
}
