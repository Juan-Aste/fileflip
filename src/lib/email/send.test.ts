import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
const createTransport = vi.fn<(options: unknown) => { sendMail: typeof sendMail }>(() => ({ sendMail }));
vi.mock("nodemailer", () => ({ createTransport: (options: unknown) => createTransport(options) }));

const { emailTransport, sendMagicLink, SEND_TIMEOUT_MS } = await import("./send");

const url = `https://fileflip.app/api/auth/callback/nodemailer?callbackUrl=${encodeURIComponent("/pt/conta")}&token=abc`;
const send = () => sendMagicLink({ to: "ana@example.com", url, from: "Fileflect <no-reply@fileflect.com>" });

const fetchMock = vi.fn();
let errors: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
  sendMail.mockReset();
  createTransport.mockClear();
});

describe("emailTransport", () => {
  it("prefers Resend, then SMTP, then the log", () => {
    expect(emailTransport({ RESEND_API_KEY: "re_x", EMAIL_SERVER: "smtp://h" })).toBe("resend");
    expect(emailTransport({ EMAIL_SERVER: "smtp://h" })).toBe("smtp");
    expect(emailTransport({})).toBe("log");
  });
});

describe("sendMagicLink through Resend", () => {
  beforeEach(() => vi.stubEnv("RESEND_API_KEY", "re_test_secret"));

  it("posts the localized email to Resend's API", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "1" }), { status: 200 }));
    await send();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ Authorization: "Bearer re_test_secret", "Content-Type": "application/json" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(String(init.body));
    expect(body.from).toBe("Fileflect <no-reply@fileflect.com>");
    expect(body.to).toBe("ana@example.com");
    expect(body.subject).toBe("Seu link para entrar no Fileflect");
    expect(body.html).toContain('lang="pt"');
    expect(body.text).toContain(url);
  });

  it("wins over SMTP when both are configured", async () => {
    vi.stubEnv("EMAIL_SERVER", "smtp://user:pass@smtp.example.com:587");
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await send();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(createTransport).not.toHaveBeenCalled();
  });

  it.each([
    [422, { statusCode: 422, name: "validation_error", message: "Invalid `from` field." }, "Invalid `from` field."],
    [500, { statusCode: 500, name: "internal_server_error", message: "Something broke" }, "Something broke"],
  ])("throws and logs Resend's error on HTTP %i", async (status, payload, message) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(payload), { status }));
    await expect(send()).rejects.toThrow(`HTTP ${status} ${message}`);
    const logged = errors.mock.calls.flat().join(" ");
    expect(logged).toContain(`HTTP ${status}`);
    expect(logged).toContain(message);
    expect(logged).not.toContain("re_test_secret");
  });

  it("gives up after the timeout and logs it", async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener("abort", () => reject(init.signal!.reason));
        }),
    );
    // Stand-in for AbortSignal.timeout, fired by hand (fake timers don't drive it).
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    const pending = expect(send()).rejects.toThrow(`timed out after ${SEND_TIMEOUT_MS} ms`);
    expect(timeout).toHaveBeenCalledWith(SEND_TIMEOUT_MS);
    controller.abort(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
    await pending;
    expect(errors.mock.calls.flat().join(" ")).toContain("timed out");
  });

  it("propagates network errors", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(send()).rejects.toThrow("fetch failed");
    expect(errors).toHaveBeenCalled();
  });
});

describe("sendMagicLink through SMTP", () => {
  it("uses short nodemailer timeouts", async () => {
    vi.stubEnv("EMAIL_SERVER", "smtp://user:pass@smtp.example.com:587");
    sendMail.mockResolvedValue({});
    await send();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.com",
        port: 587,
        auth: { user: "user", pass: "pass" },
        connectionTimeout: SEND_TIMEOUT_MS,
        greetingTimeout: SEND_TIMEOUT_MS,
        socketTimeout: SEND_TIMEOUT_MS,
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "ana@example.com", subject: "Seu link para entrar no Fileflect" }));
  });

  it("propagates SMTP errors", async () => {
    vi.stubEnv("EMAIL_SERVER", "smtp://smtp.example.com:587");
    sendMail.mockRejectedValue(new Error("Connection timeout"));
    await expect(send()).rejects.toThrow("Connection timeout");
  });
});

describe("sendMagicLink without a transport", () => {
  it("only logs the link", async () => {
    await send();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createTransport).not.toHaveBeenCalled();
  });
});
