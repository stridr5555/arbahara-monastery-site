import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const token = "synthetic-readiness-token-only";
const account = "AC" + "a".repeat(32);
beforeEach(() => {
  vi.stubEnv("TWILIO_SMS_ACCOUNT_SID", account);
  vi.stubEnv("TWILIO_SMS_AUTH_TOKEN", token);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("Internal read-only SMS readiness", () => {
  it("checks exact account ownership and reports existing callback configuration without secrets", async () => {
    const fetch = vi.fn(
      async (_url: string) =>
        new Response(
          JSON.stringify({
            incoming_phone_numbers: [
              {
                account_sid: account,
                phone_number: "+18668276926",
                sms_url:
                  "https://existing.example/api/inbound?secret=synthetic-query-secret",
                sms_method: "POST",
                sms_fallback_url: "",
                sms_application_sid: "AP-synthetic-existing-app",
              },
            ],
          }),
        ),
    );
    vi.stubGlobal("fetch", fetch);
    const t = convexTest(schema, modules);
    const result = await t.action(internal.smsReadiness.inspect, {});
    expect(result).toMatchObject({
      state: "authenticated",
      ownsExpectedNumber: true,
      hasSmsApplication: true,
      callback: {
        origin: "https://existing.example",
        path: "/api/inbound",
        hasQuery: true,
        matchesPreparedCallback: false,
      },
      fallback: null,
    });
    expect(JSON.stringify(result)).not.toContain(token);
    expect(JSON.stringify(result)).not.toContain("synthetic-query-secret");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toContain(
      "IncomingPhoneNumbers.json?PhoneNumber=%2B18668276926",
    );
    expect(
      await t.run((ctx) => ctx.db.query("smsInboundMessages").collect()),
    ).toEqual([]);
    expect(
      await t.run((ctx) => ctx.db.query("smsConsentEvents").collect()),
    ).toEqual([]);
  });
  it("rejects malformed account bindings and requires both existing bindings", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const t = convexTest(schema, modules);
    vi.stubEnv("TWILIO_SMS_ACCOUNT_SID", "not-an-account");
    expect(await t.action(internal.smsReadiness.inspect, {})).toEqual({
      state: "unexpected_account_binding",
    });
    vi.stubEnv("TWILIO_SMS_ACCOUNT_SID", account);
    vi.stubEnv("TWILIO_SMS_AUTH_TOKEN", "");
    expect(await t.action(internal.smsReadiness.inspect, {})).toEqual({
      state: "missing_binding",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns only sanitized provider status and error code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ code: 20003, message: token }), {
            status: 401,
          }),
      ),
    );
    const result = await convexTest(schema, modules).action(
      internal.smsReadiness.inspect,
      {},
    );
    expect(result).toEqual({
      state: "provider_rejected",
      httpStatus: 401,
      errorCode: 20003,
    });
    expect(JSON.stringify(result)).not.toContain(token);
  });
  it("does not mistake successful account authentication for number ownership", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ incoming_phone_numbers: [] })),
      ),
    );
    expect(
      await convexTest(schema, modules).action(
        internal.smsReadiness.inspect,
        {},
      ),
    ).toEqual({ state: "number_not_found", httpStatus: 200 });
  });
  it("checks restricted eligibility without exporting its key or creating message records", async () => {
    vi.stubEnv("SMS_ELIGIBILITY_SHARED_SECRET", "synthetic-restricted-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ allowed: false }))),
    );
    const t = convexTest(schema, modules);
    expect(
      await t.action(internal.smsReadiness.inspectEligibility, {}),
    ).toEqual({
      state: "authenticated",
      httpStatus: 200,
      allowed: false,
      responseIsBooleanOnly: true,
    });
    expect(
      await t.run((ctx) => ctx.db.query("smsConsentEvents").collect()),
    ).toEqual([]);
    expect(
      await t.run((ctx) => ctx.db.query("smsInboundMessages").collect()),
    ).toEqual([]);
  });
});
