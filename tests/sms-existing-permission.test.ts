import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
import { smsPrograms } from "../convex/smsProgram";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const phone = "+12145550101",
  other = "+12145550102",
  digest = "a".repeat(64);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const allowed = (
  t: ReturnType<typeof convexTest>,
  p = phone,
  programId: "informational" | "fundraising" = "informational",
) =>
  t.query(internal.smsEligibility.allowed, {
    phone: p,
    programId,
    disclosureVersion: smsPrograms[programId].version,
  });
describe("Owner-confirmed existing SMS permission", () => {
  it("recognizes only the explicit snapshot and informational category without manufacturing website consent", async () => {
    const t = convexTest(schema, modules);
    expect(await allowed(t)).toBe(false);
    expect(
      await t.mutation(internal.smsExistingRecipients.apply, {
        phones: [phone],
        digest,
      }),
    ).toMatchObject({ added: 1, sends: 0 });
    expect(await allowed(t)).toBe(true);
    expect(await allowed(t, other)).toBe(false);
    expect(await allowed(t, phone, "fundraising")).toBe(false);
    expect(await t.run((ctx) => ctx.db.query("smsConsents").collect())).toEqual(
      [],
    );
    expect(
      await t.run((ctx) => ctx.db.query("smsConsentEvents").collect()),
    ).toEqual([]);
    expect(
      await t.mutation(internal.smsExistingRecipients.apply, {
        phones: [phone],
        digest,
      }),
    ).toMatchObject({ added: 0, unchanged: 1 });
    expect(
      await t.query(internal.smsExistingRecipients.verify, { digest }),
    ).toEqual({ recorded: 1, eligibleNow: 1, sends: 0 });
    expect(
      await t.query(internal.smsEligibility.allowed, {
        phone,
        programId: "informational",
        disclosureVersion: "obsolete",
      }),
    ).toBe(false);
  });
  it("never imports suppressed or withdrawn recipients", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("smsPhoneSuppressions", {
        phone,
        sender: smsPrograms.informational.sender,
        stopped: true,
        carrierStatus: "blocked",
        lastMessageSid: "synthetic",
        updatedAt: 1,
      });
      const userId = await ctx.db.insert("users", {
        email: "synthetic@example.test",
      });
      const p = smsPrograms.informational;
      await ctx.db.insert("smsConsents", {
        userId,
        phone: other,
        programId: p.id,
        recordedAt: 1,
        source: p.source,
        disclosureVersion: p.version,
        disclosureText: p.disclosure,
        privacyUrl: p.privacyUrl,
        termsUrl: p.termsUrl,
        status: "withdrawn",
      });
    });
    expect(
      await t.mutation(internal.smsExistingRecipients.apply, {
        phones: [phone, other],
        digest,
      }),
    ).toMatchObject({ added: 0, suppressed: 2 });
    expect(await allowed(t)).toBe(false);
    expect(await allowed(t, other)).toBe(false);
  });
  it("a genuine STOP revokes external permission; START and another import do not resurrect it", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.smsExistingRecipients.apply, {
      phones: [phone],
      digest,
    });
    const event = {
      accountSid: "AC" + "a".repeat(32),
      phone,
      sender: smsPrograms.informational.sender,
      providerHandled: true,
    };
    await t.mutation(internal.smsInbound.record, {
      ...event,
      messageSid: "synthetic-stop",
      kind: "STOP",
    });
    expect(await allowed(t)).toBe(false);
    await t.mutation(internal.smsInbound.record, {
      ...event,
      messageSid: "synthetic-start",
      kind: "START",
    });
    await t.run(async (ctx) => {
      const row = await ctx.db.query("smsPhoneSuppressions").first();
      await ctx.db.patch(row!._id, { stopped: false });
    });
    expect(await allowed(t)).toBe(false);
    expect(
      await t.mutation(internal.smsExistingRecipients.apply, {
        phones: [phone],
        digest,
      }),
    ).toMatchObject({ added: 0, suppressed: 1 });
    const rows = await t.run((ctx) =>
      ctx.db.query("smsExistingPermissions").collect(),
    );
    expect(rows[0]).toMatchObject({ status: "withdrawn" });
    expect(typeof rows[0].withdrawnAt).toBe("number");
  });
  it.each([
    { phones: [] },
    { phones: [phone, phone] },
    { phones: ["invalid"] },
  ])("fails closed on malformed snapshots %j", async ({ phones }) => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(internal.smsExistingRecipients.apply, { phones, digest }),
    ).rejects.toThrow();
    expect(
      await t.run((ctx) => ctx.db.query("smsExistingPermissions").collect()),
    ).toEqual([]);
  });
  it("checks the bound monastery account before reading recipients, without sending or exposing credentials", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("TWILIO_SMS_ACCOUNT_SID", "");
    await expect(
      t.action(internal.smsExistingRecipients.preview, {}),
    ).rejects.toThrow("binding unavailable");
    expect(
      await t.run((ctx) => ctx.db.query("smsExistingPermissions").collect()),
    ).toEqual([]);
  });
  it("returns only aggregate snapshot evidence, aborts on a changed digest and only uses provider GETs", async () => {
    const t = convexTest(schema, modules);
    const account = "AC" + "a".repeat(32);
    vi.stubEnv("TWILIO_SMS_ACCOUNT_SID", account);
    vi.stubEnv("TWILIO_SMS_AUTH_TOKEN", "synthetic-only");
    const fetcher = vi.fn(async (url: string, options: RequestInit) => {
      expect(options.method ?? "GET").toBe("GET");
      if (url.includes("IncomingPhoneNumbers"))
        return Response.json({
          incoming_phone_numbers: [
            {
              phone_number: smsPrograms.informational.sender,
              account_sid: account,
            },
          ],
        });
      if (url.includes("Variables"))
        return Response.json({
          variables: [
            { key: "VOICE_RECIPIENTS_000", value: phone },
            { key: "VOICE_RECIPIENTS_META", value: "1" },
          ],
        });
      if (url.includes("Environments"))
        return Response.json({
          environments: [
            { unique_name: "production", sid: "ZE" + "a".repeat(32) },
          ],
        });
      return Response.json({
        services: [
          {
            unique_name: "telegram-voice-broadcast",
            sid: "ZS" + "a".repeat(32),
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetcher);
    const preview = await t.action(internal.smsExistingRecipients.preview, {});
    expect(preview).toMatchObject({
      recipients: 1,
      program: "informational",
      sends: 0,
    });
    expect(preview.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(preview)).not.toContain(phone);
    await expect(
      t.action(internal.smsExistingRecipients.importConfirmed, {
        expectedDigest: "b".repeat(64),
        ownerConfirmed: true,
      }),
    ).rejects.toThrow("Recipient list changed");
    expect(
      await t.run((ctx) => ctx.db.query("smsExistingPermissions").collect()),
    ).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(8);
  });
});
