import { adsTxt } from "@/lib/ads-txt";

// Without an AdSense client there are no ads, so the file does not exist.
export function GET() {
  const body = adsTxt(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);
  if (!body) return new Response("Not found\n", { status: 404 });
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
