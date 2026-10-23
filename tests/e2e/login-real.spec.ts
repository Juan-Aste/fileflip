// Email sign-in end to end with the real Auth.js (B-26): the production
// build with MongoDB in memory, Resend intercepted inside the server (see
// server/resend-stub.mjs, no email leaves the machine) and the app behind a
// proxy like Railway's, which forwards the public host and protocol while
// the app listens on an internal port. Nothing of Auth.js is stubbed.
import type { ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { createServer, request as httpRequest, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { TERMS_VERSION } from "../../src/config/legal";
import { startApp } from "./server/app";
import { expect, test } from "./support";

const appPort = Number(process.env.E2E_PORT ?? 3100) + 20;

/** A reverse proxy that, like Railway's edge, forwards its own (public) host and HTTPS. */
async function startProxy() {
  const proxy = createServer((req, res) => {
    const publicHost = `localhost:${(proxy.address() as AddressInfo).port}`;
    const upstream = httpRequest(
      {
        host: "127.0.0.1",
        port: appPort,
        method: req.method,
        path: req.url,
        headers: {
          ...req.headers,
          host: `127.0.0.1:${appPort}`,
          "x-forwarded-host": publicHost,
          "x-forwarded-proto": "https",
          "x-forwarded-for": req.socket.remoteAddress ?? "127.0.0.1",
        },
      },
      (answer) => {
        res.writeHead(answer.statusCode ?? 502, answer.headers);
        answer.pipe(res);
      },
    );
    upstream.on("error", () => res.writeHead(502).end());
    req.pipe(upstream);
  });
  await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  return proxy;
}

test.describe("email sign-in with the real Auth.js behind a proxy", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });
  let mongo: MongoMemoryServer;
  let app: ChildProcess;
  let proxy: Server;
  let publicBase: string;
  let mails: string;
  let dbUri: string;

  test.beforeAll(async () => {
    test.setTimeout(180_000);
    mongo = await MongoMemoryServer.create();
    proxy = await startProxy();
    // The browser talks to the proxy: that is the public origin, and AUTH_URL.
    publicBase = `http://localhost:${(proxy.address() as AddressInfo).port}`;
    mails = join(mkdtempSync(join(tmpdir(), "fileflect-mail-")), "resend.jsonl");
    app = await startApp(appPort, {
      AUTH_SECRET: "e2e-only-not-a-real-secret",
      AUTH_URL: `https://${new URL(publicBase).host}`,
      MONGODB_URI: (dbUri = `${mongo.getUri()}fileflect-login`),
      RESEND_API_KEY: "re_e2e_not_a_real_key",
      EMAIL_FROM: "Fileflect <login@e2e.test>",
      NODE_OPTIONS: `--import ${join(__dirname, "server", "resend-stub.mjs")}`,
      RESEND_STUB_FILE: mails,
    });
  });

  test.afterAll(async () => {
    app?.kill();
    proxy?.close();
    await mongo?.stop();
  });

  test("the email is sent and the form reaches the verify page", async ({ page }) => {
    await page.goto(`${publicBase}/es/login`);
    await page.getByLabel("Tu correo electrónico").fill("ana@example.com");
    const answer = page.waitForResponse("**/api/auth/signin/nodemailer");
    await page.getByRole("button", { name: "Enviarme un enlace" }).click();
    // Auth.js' real answer: JSON with its own verify-request URL on the public host.
    const { url } = await (await answer).json();
    expect(new URL(url).host).toBe(new URL(publicBase).host);
    expect(new URL(url).searchParams.has("error")).toBe(false);
    await page.waitForURL("**/es/login/verify", { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();

    // One email, to that address, with a link to the public host.
    expect(existsSync(mails)).toBe(true);
    const sent = readFileSync(mails, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("ana@example.com");
    const link = new URL(sent[0].html.match(/href="([^"]+\/api\/auth\/callback\/nodemailer[^"]*)"/)[1].replaceAll("&amp;", "&"));
    expect(link.host).toBe(new URL(publicBase).host);

    // Opening the link signs in and records the accepted terms (7.3).
    // (the test proxy has no TLS: open it over HTTP and stop at the redirect to the account).
    link.protocol = "http:";
    const signedIn = await page.request.get(link.href, { maxRedirects: 0 });
    expect(signedIn.status()).toBe(302);
    expect(new URL(signedIn.headers().location).pathname).toBe("/es/account");
    const db = new MongoClient(dbUri);
    const user = await db.db().collection("users").findOne({ email: "ana@example.com" });
    await db.close();
    expect(user).toMatchObject({ termsVersion: TERMS_VERSION });
    expect(Date.now() - user!.termsAcceptedAt.getTime()).toBeLessThan(60_000);
  });
});
