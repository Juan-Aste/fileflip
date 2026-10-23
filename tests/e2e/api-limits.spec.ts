// API body limits and error hygiene (6F.3 in PLAN.md): every API that takes
// a body stops reading once it is over its limit (also when the client sends
// no Content-Length), and no error response leaks stack traces, file paths
// or environment values.
import { request as httpRequest } from "node:http";
import { expect, test } from "./support";

const port = Number(process.env.E2E_PORT ?? 3100);
const MB = 1024 * 1024;

/**
 * POSTs a chunked body (no Content-Length) that never ends on its own: it
 * starts with `head` and goes on with filler until the server answers or
 * `capBytes` were sent. Returns the status and how much was sent by then.
 */
function streamUntilAnswered(path: string, contentType: string, head: string, capBytes: number) {
  return new Promise<{ status: number; sentBytes: number; body: string }>((resolve, reject) => {
    let sent = 0;
    let answered = false;
    const req = httpRequest({ host: "localhost", port, path, method: "POST", headers: { "content-type": contentType, "transfer-encoding": "chunked" } }, (res) => {
      answered = true;
      const at = sent;
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        resolve({ status: res.statusCode ?? 0, sentBytes: at, body });
        req.destroy();
      });
    });
    req.on("error", (e) => (answered ? undefined : reject(e)));
    const chunk = Buffer.alloc(64 * 1024, 0x61);
    const pump = () => {
      while (!answered && sent < capBytes) {
        sent += chunk.length;
        if (!req.write(chunk)) return void req.once("drain", pump);
      }
      if (!answered) req.end();
    };
    req.write(head);
    pump();
  });
}

const boundary = "----e2e";
const multipart = `--${boundary}\r\nContent-Disposition: form-data; name="to"\r\n\r\npdf\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="big.md"\r\nContent-Type: text/markdown\r\n\r\n`;

test.describe("bodies over the limit are cut off without Content-Length", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const [path, contentType, head, capBytes] of [
    ["/api/convert/markdown", `multipart/form-data; boundary=${boundary}`, multipart, 120 * MB],
    ["/api/convert/image", `multipart/form-data; boundary=${boundary}`, multipart, 120 * MB],
    ["/api/stats", "application/json", '{"x":"', 40 * MB],
    ["/api/visit", "application/json", '{"path":"', 40 * MB],
    ["/api/webhooks/mercadopago", "application/json", '{"type":"', 40 * MB],
    ["/api/auth/signin/nodemailer", "application/x-www-form-urlencoded", "email=", 40 * MB],
  ] as const) {
    test(path, async () => {
      const result = await streamUntilAnswered(path, contentType, head, capBytes);
      expect(result.status, result.body).toBe(413);
      // The server answered long before the client gave up sending.
      expect(result.sentBytes).toBeLessThan(capBytes / 2);
    });
  }
});

const leaks = /node_modules|\bat [\w.<>]+ \(|\/app\/(src|\.next)|\/home\/\w+\/|\.next\/server|e2e-only-not-a-real-secret|mongodb:\/\/|MONGODB_URI|AUTH_SECRET|stack/i;

test("error responses don't leak traces, paths or environment values", async ({ request }) => {
  const admin = `http://localhost:${port + 1}`;
  const calls: [string, string, Parameters<typeof request.fetch>[1]][] = [
    ["POST", "/api/convert/markdown", { multipart: { file: { name: "a.md", mimeType: "text/markdown", buffer: Buffer.from("# hi") } } }],
    ["POST", "/api/convert/markdown", { data: "not multipart", headers: { "content-type": "multipart/form-data; boundary=x" } }],
    ["POST", "/api/convert/image", { multipart: { file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("not a png") }, to: "webp" } }],
    ["POST", "/api/convert/document", { multipart: { file: { name: "a.docx", mimeType: "application/zip", buffer: Buffer.from("PK\x03\x04garbage") }, to: "pdf" } }],
    ["POST", "/api/convert/pdfa", { multipart: { file: { name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 garbage") }, to: "pdf" } }],
    ["POST", "/api/stats", { data: "{broken" }],
    ["POST", "/api/visit", { data: "{broken" }],
    ["POST", "/api/webhooks/mercadopago", { data: "{broken" }],
    ["POST", "/api/billing/subscribe", { data: "{broken" }],
    ["GET", "/api/search-index/xx", {}],
    ["GET", "/api/health", {}],
    ["POST", "/api/auth/signin/nodemailer", { form: { email: "a@b.co", csrfToken: "forged" } }],
    ["GET", "/api/auth/callback/nodemailer?token=forged&email=a@b.co", { maxRedirects: 0 }],
    ["GET", `${admin}/api/billing/mock-checkout?id=mock-1&back=/es`, { maxRedirects: 0 }],
    ["GET", "/api/admin/export?table=../../etc/passwd", {}],
  ];
  for (const [method, path, options] of calls) {
    const res = await request.fetch(path, { method, ...options });
    const body = await res.text();
    expect(body, `${method} ${path} → ${res.status()}`).not.toMatch(leaks);
    expect(res.status(), `${method} ${path}`).toBeLessThan(600);
  }
});
