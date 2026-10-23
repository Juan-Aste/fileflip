import { describe, expect, it } from "vitest";
import { authSecretMissing, getAuthProviders } from "./auth-providers";

const prod = { NODE_ENV: "production", AUTH_SECRET: "s", MONGODB_URI: "mongodb://db/x" };

describe("getAuthProviders", () => {
  it("offers Google and email when both are configured", () => {
    expect(
      getAuthProviders({ ...prod, AUTH_GOOGLE_ID: "a", AUTH_GOOGLE_SECRET: "b", RESEND_API_KEY: "re_x" }),
    ).toEqual({ google: true, email: true });
  });

  it("hides email without MongoDB, which Auth.js needs for magic links (B-01)", () => {
    const env = { ...prod, MONGODB_URI: undefined, AUTH_GOOGLE_ID: "a", AUTH_GOOGLE_SECRET: "b" };
    expect(getAuthProviders({ ...env, RESEND_API_KEY: "re_x" })).toEqual({ google: true, email: false });
    expect(getAuthProviders({ ...env, MONGODB_URI: "", AUTH_EMAIL_LOG_LINKS: "true" }).email).toBe(false);
    expect(getAuthProviders({ NODE_ENV: "development" }).email).toBe(false);
  });

  it("hides email in production without Resend, SMTP or log links", () => {
    expect(getAuthProviders(prod).email).toBe(false);
    expect(getAuthProviders({ ...prod, AUTH_EMAIL_LOG_LINKS: "true" }).email).toBe(true);
    expect(getAuthProviders({ ...prod, EMAIL_SERVER: "smtp://h:25" }).email).toBe(true);
  });

  it("offers nothing in production without AUTH_SECRET (B-14)", () => {
    const env = { ...prod, AUTH_SECRET: "", AUTH_GOOGLE_ID: "a", AUTH_GOOGLE_SECRET: "b", RESEND_API_KEY: "re_x" };
    expect(authSecretMissing(env)).toBe(true);
    expect(getAuthProviders(env)).toEqual({ google: false, email: false });
    expect(authSecretMissing({ NODE_ENV: "development" })).toBe(false);
  });
});
