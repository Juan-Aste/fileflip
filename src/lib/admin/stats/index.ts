import "server-only";
import type { Period } from "@/lib/admin/period";
import { tempUsage, type TempUsage } from "@/lib/server/temp";
import { accountStats, type AccountStats } from "./accounts";
import { conversionStats, type ConversionStats } from "./conversions";
import { qualityStats, type QualityStats } from "./quality";
import { toolStats, type ToolStats } from "./tools";
import { visitStats, type VisitStats } from "./visits";

export interface AdminStats {
  conversions: ConversionStats;
  quality: QualityStats;
  tools: ToolStats;
  visits: VisitStats;
  accounts: AccountStats;
  /** Of this server instance only. */
  temp: TempUsage;
}

/** Everything the admin panel shows for a period, queried in parallel. */
export async function adminStats(period: Period): Promise<AdminStats> {
  const [conversions, quality, tools, visits, accounts, temp] = await Promise.all([
    conversionStats(period),
    qualityStats(period),
    toolStats(period),
    visitStats(period),
    accountStats(period),
    tempUsage(),
  ]);
  return { conversions, quality, tools, visits, accounts, temp };
}
