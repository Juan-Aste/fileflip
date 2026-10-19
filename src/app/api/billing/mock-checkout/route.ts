import { applyProviderStatus } from "@/lib/billing";
import { mockPaymentsAllowed } from "@/lib/payments/mock";

export const runtime = "nodejs";

/** Simulated checkout (development/demo only): activates the subscription and goes back. */
export async function GET(request: Request) {
  if (!mockPaymentsAllowed()) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  if (!id.startsWith("mock-")) return new Response("Bad request", { status: 400 });
  await applyProviderStatus(id, "active");
  // Only redirect within this site.
  const back = new URL(url.searchParams.get("back") ?? "/", url.origin);
  return Response.redirect(back.origin === url.origin ? back : new URL("/", url.origin), 303);
}
