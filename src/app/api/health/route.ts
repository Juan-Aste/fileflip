import { gotenbergHealthy } from "@/lib/server/gotenberg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness check for Railway. The app is healthy even if Gotenberg is down
 * (only office conversions depend on it), so that is reported, not failed.
 */
export async function GET() {
  const gotenberg = process.env.GOTENBERG_URL ? await gotenbergHealthy() : null;
  return Response.json({ status: "ok", gotenberg }, { headers: { "Cache-Control": "no-store" } });
}
