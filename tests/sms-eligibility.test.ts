import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { smsPrograms } from "../convex/smsProgram";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const secret = "synthetic-eligibility-test-secret";
const phone = "+12145550101";
const request = {
  phone,
  programId: "informational",
  disclosureVersion: smsPrograms.informational.version,
};
beforeEach(() => vi.stubEnv("SMS_ELIGIBILITY_SHARED_SECRET", secret));
afterEach(() => vi.unstubAllEnvs());
function post(
  t: ReturnType<typeof convexTest>,
  body: unknown = request,
  token = secret,
) {
  return t.fetch("/sms/eligibility", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}
async function insert(
  t: ReturnType<typeof convexTest>,
  state: "consented" | "withdrawn" = "consented",
  time = 1,
  programId: "informational" | "fundraising" = "informational",
) {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: "synthetic-private@example.test",
      emailVerificationTime: 1,
    });
    return ctx.db.insert("smsConsents", {
      userId,
      programId,
      phone,
      recordedAt: time,
      source: smsPrograms[programId].source,
      disclosureVersion: smsPrograms[programId].version,
      disclosureText: smsPrograms[programId].disclosure,
      privacyUrl: smsPrograms[programId].privacyUrl,
      termsUrl: smsPrograms[programId].termsUrl,
      status: state,
    });
  });
}
describe("Restricted eligibility endpoint", () => {
  it("fails closed without authentication and returns no private records", async () => {
    const t = convexTest(schema, modules);
    await insert(t);
    const denied = await post(t, request, "wrong");
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({ allowed: false });
    vi.stubEnv("SMS_ELIGIBILITY_SHARED_SECRET", "");
    expect((await post(t)).status).toBe(503);
  });
  it("returns only allow/deny for exact current explicit category consent", async () => {
    const t = convexTest(schema, modules);
    expect(await (await post(t)).json()).toEqual({ allowed: false });
    await insert(t);
    const response = await post(t);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ allowed: true });
    expect(
      await (await post(t, { ...request, programId: "fundraising" })).json(),
    ).toEqual({ allowed: false });
    expect(
      await (
        await post(t, { ...request, disclosureVersion: "obsolete" })
      ).json(),
    ).toEqual({ allowed: false });
    expect(
      await t.run((ctx) => ctx.db.query("smsConsentEvents").collect()),
    ).toEqual([]);
  });
  it("honors global STOP and independent withdrawal without creating consent", async () => {
    const t = convexTest(schema, modules);
    const id = await insert(t);
    const suppressed = await t.run((ctx) =>
      ctx.db.insert("smsPhoneSuppressions", {
        phone,
        sender: "+18668276926",
        stopped: true,
        carrierStatus: "blocked",
        lastMessageSid: "synthetic",
        updatedAt: 2,
      }),
    );
    expect(await (await post(t)).json()).toEqual({ allowed: false });
    await t.run((ctx) =>
      ctx.db.patch(suppressed, { stopped: false, carrierStatus: "unblocked" }),
    );
    expect(await (await post(t)).json()).toEqual({ allowed: true });
    await t.run((ctx) =>
      ctx.db.patch(id, { status: "withdrawn", recordedAt: 3 }),
    );
    expect(await (await post(t)).json()).toEqual({ allowed: false });
  });
  it("does not let older or tied shared-phone consent override withdrawal", async () => {
    const t = convexTest(schema, modules);
    await insert(t, "consented", 2);
    await insert(t, "withdrawn", 2);
    expect(await (await post(t)).json()).toEqual({ allowed: false });
    await insert(t, "consented", 3);
    expect(await (await post(t)).json()).toEqual({ allowed: true });
  });
  it("rejects extra data requests and does not infer consent from membership", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "private@example.test",
      });
      await ctx.db.insert("members", {
        userId,
        name: "Private fixture",
        phone,
        city: "",
        language: "en",
        interests: [],
        status: "active",
        consentAt: 1,
        updatedAt: 1,
        memberNumber: "synthetic",
      });
    });
    expect(await (await post(t)).json()).toEqual({ allowed: false });
    expect((await post(t, { ...request, includeProfiles: true })).status).toBe(
      400,
    );
    expect((await post(t, { ...request, phone: "2145550101" })).status).toBe(
      400,
    );
    expect((await post(t, { ...request, programId: "all" })).status).toBe(400);
  });
  it("preserves prior explicit consent across a support-contact correction without rewriting evidence", async () => {
    const t = convexTest(schema, modules);
    const id = await insert(t);
    const oldText = smsPrograms.informational.disclosure.replace("469-212-6370", "214-803-1347");
    await t.run(ctx => ctx.db.patch(id, { disclosureVersion: "2026-10-25-v1", disclosureText: oldText }));
    expect(await (await post(t)).json()).toEqual({ allowed: true });
    expect(await t.run(ctx => ctx.db.get(id))).toMatchObject({ disclosureVersion: "2026-10-25-v1", disclosureText: oldText });
    expect(await t.run(ctx => ctx.db.query("smsConsentEvents").collect())).toEqual([]);
  });

});
