import "server-only";
import { cookies, headers } from "next/headers";
import { COUNTRY_COOKIE, detectRegion, type PricingRegion } from "@/config/pricing";

/** Pricing region of the current request (cookie → geo header → language). */
export async function currentRegion(): Promise<PricingRegion> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  return detectRegion(h, c.get(COUNTRY_COOKIE)?.value);
}
