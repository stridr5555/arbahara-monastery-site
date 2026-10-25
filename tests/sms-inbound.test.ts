import { createHmac } from "node:crypto";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { smsPrograms } from "../convex/smsProgram";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const url = "https://some.convex.site/sms/inbound";
const account = "AC" + "a".repeat(32);
const token = "synthetic-test-auth-token-only";
const phone = "+12145550101";
let sequence = 0;
const signature = (fields: Record<string, string>, target = url) =>
  createHmac("sha1", token)
    .update(
      target +
        Object.keys(fields)
          .sort()
          .map((k) => k + fields[k])
          .join(""),
    )
    .digest("base64");
const fields = (body: string, extra: Record<string, string> = {}) => ({
  AccountSid: account,
  From: phone,
  To: smsPrograms.informational.sender,
  MessageSid: "SM" + (++sequence).toString(16).padStart(32, "0"),
  Body: body,
  ...extra,
});
beforeEach(() => {
  vi.stubEnv("SMS_TWILIO_INBOUND_ENABLED", "true");
  vi.stubEnv("TWILIO_SMS_AUTH_TOKEN", token);
  vi.stubEnv("TWILIO_SMS_ACCOUNT_SID", account);
  vi.stubEnv("TWILIO_SMS_WEBHOOK_URL", url);
  vi.stubEnv("TWILIO_SMS_MESSAGING_SERVICE_SID", "");
  vi.stubEnv("SMS_TWILIO_HELP_REPLY_ENABLED", "false");
  vi.stubEnv("SMS_CONSENT_COLLECTION_ENABLED", "true");
});
afterEach(() => vi.unstubAllEnvs());
async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => ({
    alice: await ctx.db.insert("users", {
      email: "alice@example.test",
      emailVerificationTime: Date.now(),
    }),
    bob: await ctx.db.insert("users", {
      email: "bob@example.test",
      emailVerificationTime: Date.now(),
    }),
  }));
  return {
    t,
    alice: t.withIdentity({ subject: ids.alice }),
    bob: t.withIdentity({ subject: ids.bob }),
  };
}
type Test = Awaited<ReturnType<typeof setup>>["t"];
const post = (t: Test, data: Record<string, string>, sig = signature(data)) =>
  t.fetch("/sms/inbound", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": sig,
    },
    body: new URLSearchParams(data).toString(),
  });
const optIn = {
  phone,
  consent: true,
  disclosureVersion: smsPrograms.informational.version,
};

describe("Signed Twilio inbound HTTP handling", () => {
  it("fails closed while disabled or unconfigured without writing or replying", async () => {
    const { t } = await setup();
    vi.stubEnv("SMS_TWILIO_INBOUND_ENABLED", "false");
    expect((await post(t, fields("STOP"))).status).toBe(503);
    vi.stubEnv("SMS_TWILIO_INBOUND_ENABLED", "true");
    vi.stubEnv("TWILIO_SMS_AUTH_TOKEN", "");
    expect((await post(t, fields("STOP"))).status).toBe(503);
    expect(
      await t.run((ctx) => ctx.db.query("smsInboundMessages").collect()),
    ).toEqual([]);
  });
  it("rejects bad signatures, tampering and wrong account, destination, service or canonical URL", async () => {
    const { t } = await setup();
    expect((await post(t, fields("STOP"), "invalid")).status).toBe(403);
    const data = fields("HELP", {
      FutureTwilioParameter: "included in signature",
    });
    expect(
      (
        await post(
          t,
          { ...data, FutureTwilioParameter: "tampered" },
          signature(data),
        )
      ).status,
    ).toBe(403);
    expect(
      (await post(t, fields("STOP", { AccountSid: "AC" + "b".repeat(32) })))
        .status,
    ).toBe(403);
    expect((await post(t, fields("STOP", { To: "+18665550102" }))).status).toBe(
      403,
    );
    expect(
      (
        await post(
          t,
          fields("STOP", { MessagingServiceSid: "MG" + "b".repeat(32) }),
        )
      ).status,
    ).toBe(403);
    vi.stubEnv("TWILIO_SMS_MESSAGING_SERVICE_SID", "MG" + "b".repeat(32));
    expect(
      (
        await post(
          t,
          fields("HELP", { MessagingServiceSid: "MG" + "b".repeat(32) }),
        )
      ).status,
    ).toBe(200);
    vi.stubEnv("TWILIO_SMS_MESSAGING_SERVICE_SID", "");
    expect(
      (
        await post(
          t,
          fields("STOP"),
          signature(fields("STOP"), "https://forged.example/sms/inbound"),
        )
      ).status,
    ).toBe(403);
    vi.stubEnv("TWILIO_SMS_WEBHOOK_URL", "https://forged.example/sms/inbound");
    const request = fields("STOP");
    expect(
      (
        await t.fetch("/sms/inbound", {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            "x-twilio-signature": signature(
              request,
              "https://forged.example/sms/inbound",
            ),
            "x-forwarded-host": "forged.example",
          },
          body: new URLSearchParams(request).toString(),
        })
      ).status,
    ).toBe(400);
    expect(
      await t.run((ctx) => ctx.db.query("smsPhoneSuppressions").collect()),
    ).toEqual([]);
  });
  it("rejects unsupported content, duplicate fields and malformed signed event identities", async () => {
    const { t } = await setup();
    expect(
      (
        await t.fetch("/sms/inbound", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        })
      ).status,
    ).toBe(415);
    expect(
      (
        await t.fetch("/sms/inbound", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: "Body=STOP",
        })
      ).status,
    ).toBe(403);
    const data = fields("STOP");
    expect(
      (
        await t.fetch("/sms/inbound", {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            "x-twilio-signature": signature(data),
          },
          body: new URLSearchParams(data).toString() + "&Body=START",
        })
      ).status,
    ).toBe(400);
    expect((await post(t, fields("STOP", { From: "2145550101" }))).status).toBe(
      400,
    );
    expect(
      (await post(t, fields("STOP", { MessageSid: "bad-id" }))).status,
    ).toBe(400);
    expect(
      (await post(t, fields("STOP", { OptOutType: "unknown" }))).status,
    ).toBe(400);
    expect((await post(t, fields("x".repeat(66000)))).status).toBe(413);
    expect(
      await t.run((ctx) => ctx.db.query("smsInboundMessages").collect()),
    ).toEqual([]);
  });
  it("synchronizes STOP across categories and accounts once, without duplicate carrier replies", async () => {
    const s = await setup();
    for (const user of [s.alice, s.bob])
      for (const programId of ["informational", "fundraising"] as const)
        await user.mutation(api.smsConsent.optIn, { ...optIn, programId });
    vi.stubEnv("SMS_CONSENT_COLLECTION_ENABLED", "false");
    const stop = fields("localized configured keyword", { OptOutType: "STOP" });
    const response = await post(s.t, stop);
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain("<Message>");
    await post(s.t, stop);
    expect(
      await s.t.run((ctx) => ctx.db.query("smsInboundMessages").collect()),
    ).toHaveLength(1);
    for (const user of [s.alice, s.bob]) {
      expect(
        (await user.query(api.smsConsent.mine, {})).every(
          (c) => c.status === "withdrawn",
        ),
      ).toBe(true);
      const history = (await user.query(api.members.exportMine, {}))
        .smsConsentHistory;
      expect(history).toHaveLength(4);
      expect(
        history.filter((c) => c.providerMessageSid === stop.MessageSid),
      ).toHaveLength(2);
    }
    expect(
      await s.t.query(internal.smsInbound.suppressionForPhone, { phone }),
    ).toMatchObject({ stopped: true, carrierStatus: "blocked" });
  });
  it("does not treat YES or carrier START/UNSTOP as category consent", async () => {
    const s = await setup();
    await s.alice.mutation(api.smsConsent.optIn, {
      ...optIn,
      programId: "informational",
    });
    await post(s.t, fields(" stop "));
    await post(s.t, fields("YES", { OptOutType: "START" }));
    expect(
      await s.t.query(internal.smsInbound.suppressionForPhone, { phone }),
    ).toMatchObject({ stopped: true, carrierStatus: "blocked" });
    await expect(
      s.alice.mutation(api.smsConsent.optIn, {
        ...optIn,
        programId: "informational",
      }),
    ).rejects.toThrow("START or UNSTOP");
    await post(s.t, fields("UNSTOP", { OptOutType: "START" }));
    expect(
      await s.t.query(internal.smsInbound.suppressionForPhone, { phone }),
    ).toMatchObject({ stopped: true, carrierStatus: "unblocked" });
    expect((await s.alice.query(api.smsConsent.mine, {}))[0].status).toBe(
      "withdrawn",
    );
    await s.alice.mutation(api.smsConsent.optIn, {
      ...optIn,
      programId: "fundraising",
    });
    expect(
      (await s.alice.query(api.smsConsent.mine, {})).map((c) => [
        c.programId,
        c.status,
      ]),
    ).toEqual([
      ["informational", "withdrawn"],
      ["fundraising", "consented"],
    ]);
    expect(
      await s.t.query(internal.smsInbound.suppressionForPhone, { phone }),
    ).toMatchObject({ stopped: false, carrierStatus: "unblocked" });
  });
  it("stores unknown-number STOP without creating an account, and dedupes late replay after reconsent", async () => {
    const s = await setup();
    const stop = fields("STOP");
    await post(s.t, stop);
    expect(await s.alice.query(api.smsConsent.mine, {})).toEqual([]);
    await post(s.t, fields("START"));
    await s.alice.mutation(api.smsConsent.optIn, {
      ...optIn,
      programId: "informational",
    });
    await post(s.t, stop);
    expect((await s.alice.query(api.smsConsent.mine, {}))[0].status).toBe(
      "consented",
    );
    await post(s.t, fields("STOP"));
    expect((await s.alice.query(api.smsConsent.mine, {}))[0].status).toBe(
      "withdrawn",
    );
  });
  it("gates custom HELP, escapes approved text, and never duplicates Advanced Opt-Out replies", async () => {
    const { t } = await setup();
    expect(await (await post(t, fields("HELP"))).text()).not.toContain(
      "<Message>",
    );
    vi.stubEnv("SMS_TWILIO_HELP_REPLY_ENABLED", "true");
    vi.stubEnv(
      "SMS_TWILIO_HELP_REPLY_TEXT",
      "Synthetic support <office> & questions",
    );
    const help = fields("HELP");
    const reply = await post(t, help);
    expect(await reply.text()).toContain(
      "<Message>Synthetic support &lt;office&gt; &amp; questions</Message>",
    );
    expect(await (await post(t, help)).text()).not.toContain("<Message>");
    expect(
      await (await post(t, fields("HELP", { OptOutType: "HELP" }))).text(),
    ).not.toContain("<Message>");
    await post(t, fields("STOP"));
    expect(await (await post(t, fields("HELP"))).text()).not.toContain(
      "<Message>",
    );
    expect(
      await (await post(t, fields("ordinary message"))).text(),
    ).not.toContain("<Message>");
    expect(await t.run((ctx) => ctx.db.query("smsConsents").collect())).toEqual(
      [],
    );
  });
});
