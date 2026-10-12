import { convexTest } from "convex-test";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { generateKeyPair, exportPKCS8 } from "jose";

const modules = import.meta.glob("../convex/**/*.{ts,js}");
describe("Password authentication and provider availability", () => {
  beforeEach(async () => {
    const { privateKey } = await generateKeyPair("RS256", {
      extractable: true,
    });
    vi.stubEnv("JWT_PRIVATE_KEY", await exportPKCS8(privateKey));
    vi.stubEnv("CONVEX_SITE_URL", "https://auth.example.com");
    vi.stubEnv("SITE_URL", "https://example.com");
    vi.stubEnv("MAIL_BRIDGE_SECRET", "test-only-mail-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it("does not advertise unconfigured OAuth providers or expose credentials", async () => {
    vi.stubEnv("AUTH_GOOGLE_ENABLED", "false");
    vi.stubEnv("AUTH_FACEBOOK_ENABLED", "false");
    const t = convexTest(schema, modules);
    expect(await t.query(api.authOptions.available, {})).toEqual({
      google: false,
      facebook: false,
    });
  });
  it("rejects short passwords before creating an account", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: {
          email: "member@example.com",
          password: "short",
          flow: "signUp",
        },
      }),
    ).rejects.toThrow("12 and 128");
    expect(await t.run((ctx) => ctx.db.query("users").collect())).toHaveLength(
      0,
    );
  });
  it("links a new password to an existing verified member, but requires proof before signing in", async () => {
    const t = convexTest(schema, modules);
    const id = await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "member@example.com",
        emailVerificationTime: Date.now(),
      }),
    );
    const params = {
      email: " Member@Example.com ",
      password: "A test passphrase 123!",
      flow: "signUp",
    };
    const result = await t.action(api.auth.signIn, {
      provider: "password",
      params,
    });
    expect(result.tokens).toBeNull();
    const accounts = await t.run((ctx) =>
      ctx.db.query("authAccounts").collect(),
    );
    expect(accounts).toHaveLength(1);
    expect(accounts[0].userId).toBe(id);
    expect(accounts[0].emailVerified).toBeUndefined();
    expect(accounts[0].secret).not.toBe(params.password);
    expect(await t.run((ctx) => ctx.db.query("users").collect())).toHaveLength(
      1,
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/api/member-mail",
      expect.objectContaining({
        body: expect.stringContaining('"purpose":"verify-email"'),
      }),
    );
    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: {
          email: "member@example.com",
          password: "incorrect password",
          flow: "signIn",
        },
      }),
    ).rejects.toThrow();
    const mail = vi.mocked(fetch).mock.calls[0][1];
    const { code } = JSON.parse(String(mail?.body));
    const verified = await t.action(api.auth.signIn, {
      provider: "password",
      params: { email: "member@example.com", flow: "email-verification", code },
    });
    expect(verified.tokens?.token).toBeTruthy();
    vi.mocked(fetch).mockClear();
    const signedIn = await t.action(api.auth.signIn, {
      provider: "password",
      params: {
        email: "member@example.com",
        password: params.password,
        flow: "signIn",
      },
    });
    expect(signedIn.tokens?.token).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    const beforeReset = await t.run((ctx) =>
      ctx.db.query("authSessions").collect(),
    );
    expect(beforeReset.length).toBeGreaterThan(0);
    await t.action(api.auth.signIn, {
      provider: "password",
      params: { email: "member@example.com", flow: "reset" },
    });
    const resetMail = JSON.parse(
      String(vi.mocked(fetch).mock.calls[0][1]?.body),
    );
    expect(resetMail.purpose).toBe("reset-password");
    const reset = await t.action(api.auth.signIn, {
      provider: "password",
      params: {
        email: "member@example.com",
        flow: "reset-verification",
        code: resetMail.code,
        newPassword: "A different passphrase 456!",
      },
    });
    expect(reset.tokens?.token).toBeTruthy();
    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: {
          email: "member@example.com",
          password: params.password,
          flow: "signIn",
        },
      }),
    ).rejects.toThrow();
    expect(
      await t.run((ctx) => ctx.db.query("authSessions").collect()),
    ).toHaveLength(1);
    expect(await t.run((ctx) => ctx.db.query("users").collect())).toHaveLength(
      1,
    );
  });
});
