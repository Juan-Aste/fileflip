import type { Plan } from "@/config/limits";

export type AdMode = "hidden" | "reserved" | "placeholder" | "ad";

/**
 * Pro users never see ads. Until we know the plan the slot's space is kept
 * empty ("reserved"): no ad flashes for Pro users and, for everyone else
 * (most visitors), nothing moves when the ad appears. Without an AdSense
 * client id, a placeholder marks where the ad would go.
 */
export function adMode({ client, plan, loaded }: { client?: string; plan: Plan; loaded: boolean }): AdMode {
  if (plan === "pro") return "hidden";
  if (!loaded) return "reserved";
  return client ? "ad" : "placeholder";
}
