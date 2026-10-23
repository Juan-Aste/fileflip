// The production build started with missing variables and broken services
// (6D.2 in PLAN.md): MongoDB (in memory) that is down at start and comes back,
// Gotenberg that never answers and no environment at all. No page may answer
// 500 or render blank, and everything works once MongoDB is back.
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { MongoClient, ObjectId } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { expect, test } from "./support";

const basePort = Number(process.env.E2E_PORT ?? 3100) + 10;
const admin = "admin@env.test";

/** `next start` with exactly `env` (plus PATH/HOME), resolved once it answers. */
async function startApp(port: number, env: Record<string, string>) {
  const base = `http://localhost:${port}`;
  if (await fetch(`${base}/api/health`).then(() => true, () => false)) throw new Error(`Port ${port} is already in use`);
  // Node runs Next directly (not through npx), so kill() stops the server.
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-p", String(port)], {
    env: { PATH: process.env.PATH!, HOME: process.env.HOME!, NODE_ENV: "production", ...env },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr!.on("data", (chunk) => (stderr += chunk));
  for (let i = 0; i < 120; i++) {
    if (await fetch(`${base}/api/health`).then((r) => r.ok, () => false)) return { child, base };
    if (child.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  child.kill();
  throw new Error(`next start did not come up on ${port}: ${stderr.slice(-2000)}`);
}

/** Every page answers with a real page: no 500, no blank body. */
async function expectPagesWork(base: string, paths: string[], cookie?: string) {
  for (const path of paths) {
    const res = await fetch(`${base}${path}`, { redirect: "manual", headers: cookie ? { cookie } : {} });
    expect(res.status, path).toBeLessThan(500);
    const html = res.headers.get("content-type")?.startsWith("text/html");
    if (res.status === 200 && html) expect((await res.text()).length, path).toBeGreaterThan(5000);
  }
}

const publicPages = ["/es", "/en", "/es/herramientas", "/en/pricing", "/es/pricing", "/en/login", "/en/account", "/es/admin", "/en/credits", "/en/contact", "/en/merge-pdf", "/en/word-to-pdf", "/robots.txt", "/sitemap.xml", "/api/health", "/api/auth/session"];

test.describe("MongoDB down and back, Gotenberg hanging", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });
  let mongo: MongoMemoryServer;
  let mongoPort: number;
  let gotenberg: Server;
  let app: { child: ChildProcess; base: string };
  let cookie: string;

  test.beforeAll(async () => {
    test.setTimeout(180_000);
    mongo = await MongoMemoryServer.create();
    mongoPort = Number(new URL(mongo.getUri()).port);
    // A Gotenberg that accepts the request and never answers.
    gotenberg = createServer((req) => req.resume()).listen(0);
    const uri = `mongodb://127.0.0.1:${mongoPort}/fileflect-env`;
    // An admin with a database session (MONGODB_URI → database sessions).
    const db = new MongoClient(uri);
    const userId = new ObjectId();
    await db.db().collection("users").insertOne({ _id: userId, email: admin, name: "Env Admin", emailVerified: new Date() });
    await db.db().collection("sessions").insertOne({ sessionToken: "env-session", userId, expires: new Date(Date.now() + 86_400_000) });
    await db.close();
    cookie = "authjs.session-token=env-session";
    // The app starts while MongoDB is down (e.g. both restarting on Railway).
    await mongo.stop({ doCleanup: false });
    app = await startApp(basePort, {
      AUTH_SECRET: "e2e-only-not-a-real-secret",
      MONGODB_URI: uri,
      ADMIN_EMAILS: admin,
      AUTH_EMAIL_LOG_LINKS: "true",
      GOTENBERG_URL: `http://127.0.0.1:${(gotenberg.address() as AddressInfo).port}`,
      GOTENBERG_TIMEOUT_MS: "3000",
    });
  });

  test.afterAll(async () => {
    app?.child.kill();
    gotenberg?.close();
    await mongo?.stop();
  });

  test("MongoDB down at start: no 500 and no long hangs", async () => {
    const started = Date.now();
    await expectPagesWork(app.base, [...publicPages, "/es/account"], cookie);
    // Each MongoDB wait is bounded (server selection timeout), not 30 s per page.
    expect(Date.now() - started).toBeLessThan(150_000);
  });

  test("MongoDB back: the session works without restarting the app (B-16)", async () => {
    await mongo.start(true);
    expect(Number(new URL(mongo.getUri()).port)).toBe(mongoPort);
    await expect
      .poll(
        async () => (await (await fetch(`${app.base}/api/auth/session`, { headers: { cookie } })).json())?.user?.email,
        { timeout: 60_000 },
      )
      .toBe(admin);
  });

  test("signed in, everything works with MongoDB up", async () => {
    await expectPagesWork(app.base, [...publicPages, "/es/account", "/api/auth/providers"], cookie);
    const session = await (await fetch(`${app.base}/api/auth/session`, { headers: { cookie } })).json();
    expect(session.user.email).toBe(admin);
  });

  test("a hanging Gotenberg gives a clear 503 within its timeout", async () => {
    const form = new FormData();
    form.set("file", new File(["# Hola"], "a.md", { type: "text/markdown" }));
    form.set("to", "pdf");
    const started = Date.now();
    const res = await fetch(`${app.base}/api/convert/markdown`, { method: "POST", body: form });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "serviceUnavailable" });
    expect(Date.now() - started).toBeLessThan(15_000);
    expect((await (await fetch(`${app.base}/api/health`)).json()).gotenberg).toBe(false);
  });

  test("admin CSV export failure is shown in the panel, not saved as a file (B-12)", async ({ page }) => {
    await page.context().addCookies([{ name: "authjs.session-token", value: "env-session", url: app.base }]);
    await page.goto(`${app.base}/es/admin`);
    let downloads = 0;
    page.on("download", () => downloads++);
    await page.route("**/api/admin/export**", (route) =>
      route.fulfill({ status: 503, json: { error: "serviceUnavailable" } }),
    );
    const link = page.getByRole("link", { name: /CSV\s*: Conversiones por día/ });
    await link.click();
    await expect(page.getByRole("alert").filter({ hasText: "No se pudo exportar" }).first()).toBeVisible();
    expect(downloads).toBe(0);
    // Once the API works, the same link downloads the CSV.
    await page.unroute("**/api/admin/export**");
    const download = page.waitForEvent("download");
    await link.click();
    expect((await download).suggestedFilename()).toMatch(/^fileflect-conversions-per-day-.*\.csv$/);
    await expect(page.getByRole("alert").filter({ hasText: "No se pudo exportar" })).toHaveCount(0);
  });
});

test.describe("no environment variables at all", () => {
  test.describe.configure({ timeout: 120_000 });
  let app: { child: ChildProcess; base: string };
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    app = await startApp(basePort + 1, {});
  });
  test.afterAll(() => {
    app?.child.kill();
  });

  test("every page works and nobody is signed in (B-14)", async ({ page }) => {
    await expectPagesWork(app.base, publicPages);
    expect(await (await fetch(`${app.base}/api/auth/session`)).json()).toBeNull();
    // Sign-in itself is unavailable, with a code instead of Auth.js' 500.
    expect((await fetch(`${app.base}/api/auth/providers`)).status).toBe(503);
    await page.goto(`${app.base}/en/login`);
    await expect(page.getByText("Sign-in isn't configured yet.")).toBeVisible();
    const form = new FormData();
    form.set("file", new File(["# Hi"], "a.md"));
    form.set("to", "pdf");
    expect((await fetch(`${app.base}/api/convert/markdown`, { method: "POST", body: form })).status).toBe(503);
  });
});
