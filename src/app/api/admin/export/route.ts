import { requireAdminApi } from "@/lib/admin/access";
import { csvTables, isCsvTable, tableCsv } from "@/lib/admin/csv";
import { dayKey, resolvePeriod } from "@/lib/admin/period";
import { accountStats } from "@/lib/admin/stats/accounts";
import { conversionStats } from "@/lib/admin/stats/conversions";
import { qualityStats } from "@/lib/admin/stats/quality";
import { visitStats } from "@/lib/admin/stats/visits";

export const dynamic = "force-dynamic";

const sources = { conversions: conversionStats, quality: qualityStats, visits: visitStats, accounts: accountStats };

/**
 * GET /api/admin/export?table=top-conversions&period=7d (same period params
 * as /api/admin/stats). One table of the panel as a CSV download; only the
 * aggregation it needs runs. Admins only: 404 otherwise.
 */
export async function GET(request: Request) {
  const access = await requireAdminApi();
  if ("response" in access) return access.response;
  const query = Object.fromEntries(new URL(request.url).searchParams);
  if (!isCsvTable(query.table)) return Response.json({ error: "invalidRequest" }, { status: 400 });
  if (!process.env.MONGODB_URI) return Response.json({ error: "serviceUnavailable" }, { status: 503 });
  const period = resolvePeriod(query);
  const { source } = csvTables[query.table];
  try {
    const stats = { [source]: await sources[source](period) };
    const lastDay = dayKey(new Date(period.end.getTime() - 1));
    const filename = `fileflip-${query.table}-${dayKey(period.start)}_${lastDay}.csv`;
    return new Response(tableCsv(query.table, stats as Parameters<typeof tableCsv>[1]), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Admin export failed", error);
    return Response.json({ error: "serviceUnavailable" }, { status: 503 });
  }
}
