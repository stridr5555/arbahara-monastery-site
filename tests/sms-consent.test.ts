import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { smsPrograms } from "../convex/smsProgram";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const choice = {
  programId: "informational" as const,
  phone: "214-555-0101",
  consent: true,
  disclosureVersion: smsPrograms.informational.version,
};

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => ({
    alice: await ctx.db.insert("users", {
      email: "alice@example.com",
      emailVerificationTime: Date.now(),
    }),
    bob: await ctx.db.insert("users", {
      email: "bob@example.com",
      emailVerificationTime: Date.now(),
    }),
  }));
  return {
    t,
    alice: t.withIdentity({ subject: ids.alice }),
    bob: t.withIdentity({ subject: ids.bob }),
  };
}
afterEach(() => vi.unstubAllEnvs());
describe("Independent optional SMS consent", () => {
  it("keeps collection closed by default and leaves membership independent", async () => {
    vi.stubEnv("SMS_CONSENT_COLLECTION_ENABLED", "false");
    const s = await setup();
    await expect(
      s.alice.mutation(api.smsConsent.optIn, choice),
    ).rejects.toThrow("not open");
    await s.alice.mutation(api.members.save, {
      name: "Synthetic member",
      phone: "",
      city: "",
      language: "en",
      interests: [],
      consent: true,
      enroll: true,
    });
    expect((await s.alice.query(api.members.me, {}))?.profile?.status).toBe(
      "active",
    );
    expect(await s.alice.query(api.smsConsent.mine, {})).toEqual([]);
    expect(
      await s.t.run((ctx) => ctx.db.query("smsConsentEvents").collect()),
    ).toEqual([]);
  });
  it("requires explicit current disclosure consent and verified identity", async () => {
    vi.stubEnv("SMS_CONSENT_COLLECTION_ENABLED", "true");
    const s = await setup();
    await expect(s.t.mutation(api.smsConsent.optIn, choice)).rejects.toThrow(
      "sign in",
    );
    await expect(
      s.alice.mutation(api.smsConsent.optIn, { ...choice, consent: false }),
    ).rejects.toThrow("explicit");
    await expect(
      s.alice.mutation(api.smsConsent.optIn, {
        ...choice,
        disclosureVersion: "old",
      }),
    ).rejects.toThrow("changed");
    await expect(
      s.alice.mutation(api.smsConsent.optIn, { ...choice, phone: "invalid" }),
    ).rejects.toThrow("valid");
    expect(await s.alice.query(api.smsConsent.mine, {})).toEqual([]);
  });
  it("records exact evidence separately by category, without duplicate saves or other-user exposure", async () => {
    vi.stubEnv("SMS_CONSENT_COLLECTION_ENABLED", "true");
    const s = await setup();
    await s.alice.mutation(api.smsConsent.optIn, choice);
    await s.alice.mutation(api.smsConsent.optIn, choice);
    expect(await s.bob.query(api.smsConsent.mine, {})).toEqual([]);
    await s.bob.mutation(api.smsConsent.withdraw, {
      programId: "informational",
    });
    const first = await s.alice.query(api.smsConsent.mine, {});
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      programId: "informational",
      phone: "+12145550101",
      disclosureVersion: smsPrograms.informational.version,
      disclosureText: smsPrograms.informational.disclosure,
      source: smsPrograms.informational.source,
      recordedAt: expect.any(Number),
    });
    await s.alice.mutation(api.smsConsent.optIn, {
      ...choice,
      programId: "fundraising",
    });
    await s.alice.mutation(api.smsConsent.withdraw, {
      programId: "informational",
    });
    await s.alice.mutation(api.smsConsent.withdraw, {
      programId: "informational",
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
    const own = await s.alice.query(api.members.exportMine, {});
    expect(own.smsConsentHistory.map((e) => e.event)).toEqual([
      "consented",
      "consented",
      "withdrawn",
    ]);
    expect(
      (await s.bob.query(api.members.exportMine, {})).smsConsentHistory,
    ).toEqual([]);
  });
  it("does not transfer consent from membership edits and permits withdrawal while collection is closed", async () => {
    vi.stubEnv("SMS_CONSENT_COLLECTION_ENABLED", "true");
    const s = await setup();
    await s.alice.mutation(api.smsConsent.optIn, choice);
    await s.alice.mutation(api.members.save, {
      name: "Synthetic member",
      phone: "2145550102",
      city: "",
      language: "en",
      interests: [],
      consent: true,
      enroll: true,
    });
    expect((await s.alice.query(api.smsConsent.mine, {}))[0].phone).toBe(
      "+12145550101",
    );
    await s.alice.mutation(api.smsConsent.optIn, {
      ...choice,
      phone: "2145550103",
    });
    const history = (await s.alice.query(api.members.exportMine, {}))
      .smsConsentHistory;
    expect(history.map((e) => [e.phone, e.event])).toEqual([
      ["+12145550101", "consented"],
      ["+12145550101", "withdrawn"],
      ["+12145550103", "consented"],
    ]);
    vi.stubEnv("SMS_CONSENT_COLLECTION_ENABLED", "false");
    await s.alice.mutation(api.smsConsent.withdraw, {
      programId: "informational",
    });
    expect((await s.alice.query(api.smsConsent.mine, {}))[0].status).toBe(
      "withdrawn",
    );
  });
});
