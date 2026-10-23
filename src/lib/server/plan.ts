import "server-only";
import { auth } from "@/auth";
import type { Plan } from "@/config/limits";
import { planForUser } from "@/lib/billing";

/** Plan of the user making the current request (free when anonymous). */
export async function requestPlan(): Promise<{ plan: Plan; signedIn: boolean; userId?: string }> {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id || undefined;
  return { plan: userId ? await planForUser(userId) : "free", signedIn: Boolean(userId), userId };
}
