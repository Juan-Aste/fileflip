import type { Plan } from "@/config/limits";

export type AdMode = "hidden" | "placeholder" | "ad";

/**
 * Pro users never see ads; nothing is shown until we know the plan (so Pro
 * users don't see an ad flash). Without an AdSense client id, a placeholder
 * marks where the ad would go.
 */
export function adMode({ client, plan, loaded }: { client?: string; plan: Plan; loaded: boolean }): AdMode {
  if (!loaded || plan === "pro") return "hidden";
  return client ? "ad" : "placeholder";
}
