import { requireAdminApi } from "@/lib/admin/access";
import { resolvePeriod } from "@/lib/admin/period";
import { adminStats } from "@/lib/admin/stats";

export const dynamic = "force-dynamic";

/** GET /api/admin/stats?period=7d (or period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD). Admins only: 404 otherwise. */
export async function GET(request: Request) {
  const access = await requireAdminApi();
  if ("response" in access) return access.response;
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const period = resolvePeriod(query);
  if (!process.env.MONGODB_URI) return Response.json({ period, stats: null }, { headers: { "Cache-Control": "no-store" } });
  try {
    return Response.json({ period, stats: await adminStats(period) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin stats failed", error);
    return Response.json({ error: "serviceUnavailable" }, { status: 503 });
  }
}
