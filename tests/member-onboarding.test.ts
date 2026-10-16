import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { approvalStart, shiftMonth } from "../convex/ledger";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const fields = {
  name: "Synthetic family",
  phone: "",
  city: "",
  language: "en" as const,
  interests: [],
  consent: true,
  enroll: true,
};
async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const alice = await ctx.db.insert("users", {
      email: "alice@example.com",
      emailVerificationTime: Date.now(),
    });
    const bob = await ctx.db.insert("users", {
      email: "bob@example.com",
      emailVerificationTime: Date.now(),
    });
    const third = await ctx.db.insert("users", {
      email: "third@example.com",
      emailVerificationTime: Date.now(),
    });
    return { alice, bob, third };
  });
  return {
    t,
    ids,
    alice: t.withIdentity({ subject: ids.alice }),
    bob: t.withIdentity({ subject: ids.bob }),
    third: t.withIdentity({ subject: ids.third }),
  };
}
describe("Immediate membership and automatic private family billing", () => {
  it("does not backfill historical dues or block registration on a closed accounting month", async () => {
    const s = await setup();
    const current = shiftMonth(approvalStart(Date.now()), -1);
    await s.t.run((ctx) =>
      ctx.db.insert("accountingPeriods", {
        month: current,
        closedBy: s.ids.third,
        closedAt: Date.now(),
      }),
    );
    await s.alice.mutation(api.members.save, fields);
    const own = (await s.alice.query(api.households.mine, {}))!;
    expect(own.household.status).toBe("active");
    expect(own.dues).toHaveLength(11);
    await s.t.run((ctx) =>
      ctx.db.patch(own.household._id, { duesStart: "2020-01" }),
    );
    await s.alice.mutation(api.members.save, fields);
    expect(
      (await s.alice.query(api.households.mine, {}))?.dues.every(
        (c) => c.month >= current,
      ),
    ).toBe(true);
  });
  it("indexes existing registered phone numbers without exposing roster records", async () => {
    const s = await setup();
    await s.alice.mutation(api.members.save, {
      ...fields,
      phone: "2145550101",
    });
    const member = (await s.alice.query(api.members.me, {}))!.profile!;
    await s.t.run((ctx) => ctx.db.patch(member._id, { phoneKey: undefined }));
    expect(
      (
        await s.t.mutation(internal.familyBilling.backfillContacts, {
          cursor: null,
        })
      ).done,
    ).toBe(true);
    await s.bob.mutation(api.members.save, {
      ...fields,
      phone: "2145550102",
      spouseContactKind: "phone",
      spouseContact: "2145550101",
      familyConsent: true,
    });
    expect((await s.bob.query(api.familyBilling.mine, {}))[0].status).toBe(
      "linked",
    );
    await s.alice.mutation(api.familyBilling.link, {
      kind: "phone",
      contact: "2145550102",
      consent: true,
    });
    expect(
      (await s.alice.query(api.familyBilling.mine, {})).filter(
        (r) => r.status === "linked",
      ),
    ).toHaveLength(1);
  });
  it("activates official membership immediately and assesses $20, without a bank mandate", async () => {
    const s = await setup();
    await s.alice.mutation(api.members.save, fields);
    const me = await s.alice.query(api.members.me, {}),
      h = await s.alice.query(api.households.mine, {});
    expect(me?.profile?.status).toBe("active");
    expect(me?.role).toBe("member");
    expect(h?.household.status).toBe("active");
    expect(h?.household.duesStart).toBe(
      shiftMonth(approvalStart(Date.now()), -1),
    );
    expect(h?.dues).toHaveLength(12);
    expect(h?.dues.every((c) => c.amountCents === 2000)).toBe(true);
    await s.alice.mutation(api.members.save, fields);
    expect((await s.alice.query(api.households.mine, {}))?.dues).toHaveLength(
      12,
    );
    expect(await s.alice.query(api.achRecords.mine, {})).toEqual([]);
    expect(await s.alice.query(api.donations.mine, {})).toEqual([]);
  });
  it("does not enroll donation-only accounts or silently enroll older application clients", async () => {
    const s = await setup();
    expect((await s.alice.query(api.members.me, {}))?.profile).toBeNull();
    expect(await s.alice.query(api.households.mine, {})).toBeNull();
    await s.bob.mutation(api.members.save, { ...fields, enroll: false });
    expect((await s.bob.query(api.households.mine, {}))?.dues).toEqual([]);
    await s.bob.mutation(api.members.save, fields);
    expect((await s.bob.query(api.members.me, {}))?.profile?.status).toBe(
      "active",
    );
  });
  it.each(["email", "phone"] as const)(
    "matches by %s automatically, without transferring private account access",
    async (kind) => {
      const s = await setup();
      await s.alice.mutation(api.members.save, {
        ...fields,
        name: "Private Alice",
        address: "Private Alice address",
        phone: "(214) 555-0101",
      });
      const original = (await s.alice.query(api.households.mine, {}))!.household
        ._id;
      await s.alice.mutation(api.donations.reportZelle, {
        amountCents: 1000,
        fund: "general",
        giftDate: "2026-10-15",
        reference: "SYNTHETIC-PRIVATE",
        requestId: "synthetic-private-gift",
      });
      await s.bob.mutation(api.members.save, {
        ...fields,
        name: "Bob",
        phone: "2145550102",
        spouseContactKind: kind,
        spouseContact:
          kind === "email" ? " ALICE@EXAMPLE.COM " : "+1 214-555-0101",
        familyConsent: true,
      });
      const family = await s.bob.query(api.familyBilling.mine, {}),
        own = (await s.bob.query(api.households.mine, {}))!;
      expect(family[0].status).toBe("linked");
      expect(own.household._id).not.toBe(original);
      expect(own.household.billingHouseholdId).toBe(original);
      expect(own.dues).toHaveLength(0);
      expect(own.receipts).toEqual([]);
      expect(JSON.stringify(own)).not.toContain("Private Alice address");
      expect(await s.bob.query(api.donations.mine, {})).toEqual([]);
      expect(
        (await s.bob.query(api.members.exportMine, {})).household?._id,
      ).toBe(own.household._id);
      await s.t.mutation(internal.households.extendDues, { cursor: null });
      expect((await s.bob.query(api.households.mine, {}))?.dues).toHaveLength(
        0,
      );
      expect((await s.alice.query(api.households.mine, {}))?.dues).toHaveLength(
        12,
      );
      await expect(
        s.bob.query(api.familyBilling.officeList, {}),
      ).rejects.toThrow("permission");
    },
  );
  it("matches a saved contact when the spouse later registers, without blocking either registration", async () => {
    const s = await setup();
    await s.alice.mutation(api.members.save, {
      ...fields,
      phone: "2145550101",
      spouseContactKind: "phone",
      spouseContact: "2145550102",
      familyConsent: true,
    });
    expect((await s.alice.query(api.familyBilling.mine, {}))[0].status).toBe(
      "waiting_for_match",
    );
    expect((await s.alice.query(api.members.me, {}))?.profile?.status).toBe(
      "active",
    );
    await s.bob.mutation(api.members.save, { ...fields, phone: "2145550102" });
    expect((await s.alice.query(api.familyBilling.mine, {}))[0].status).toBe(
      "linked",
    );
    expect((await s.bob.query(api.households.mine, {}))?.dues).toHaveLength(0);
  });
  it("preserves paid history and bank instructions, reversing only unpaid current/future duplicate assessments", async () => {
    const s = await setup();
    await s.alice.mutation(api.members.save, {
      ...fields,
      phone: "2145550101",
    });
    await s.bob.mutation(api.members.save, { ...fields, phone: "2145550102" });
    const b = (await s.bob.query(api.households.mine, {}))!;
    const bank = await s.t.run(async (ctx) => {
      const receipt = await ctx.db.insert("receipts", {
        householdId: b.household._id,
        date: "2026-10-15",
        method: "cash",
        duesCents: 2000,
        giftCents: 0,
        amountCents: 2000,
        reference: "SYNTHETIC",
        requestId: "synthetic-paid",
        createdBy: s.ids.bob,
        createdAt: Date.now(),
        journalId: b.dues[0].journalId,
      });
      await ctx.db.insert("duesAllocations", {
        receiptId: receipt,
        chargeId: b.dues[0]._id,
        journalId: b.dues[0].journalId,
        amountCents: 2000,
        createdBy: s.ids.bob,
        createdAt: Date.now(),
      });
      return ctx.db.insert("achRequests", {
        userId: s.ids.bob,
        householdId: b.household._id,
        encryptedDetails: "synthetic-only",
        lastFour: "1234",
        accountHolder: "Synthetic",
        bankName: "Synthetic bank",
        accountType: "checking",
        ownership: "personal",
        frequency: "monthly",
        amountCents: 2000,
        consentVersion: "test",
        consentText: "Synthetic",
        status: "submitted",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    await s.bob.mutation(api.familyBilling.link, {
      kind: "email",
      contact: "alice@example.com",
      consent: true,
    });
    expect(
      (await s.bob.query(api.familyBilling.mine, {}))[0].reconciliationRequired,
    ).toBe(true);
    const charges = await s.t.run((ctx) =>
      ctx.db
        .query("duesCharges")
        .withIndex("by_household_month", (q) =>
          q.eq("householdId", b.household._id),
        )
        .collect(),
    );
    expect(charges.filter((c) => c.cancelledBy)).toHaveLength(11);
    expect(
      (await s.bob.query(api.households.mine, {}))?.dues[0].paidCents,
    ).toBe(2000);
    expect((await s.t.run((ctx) => ctx.db.get(bank)))?.status).toBe(
      "submitted",
    );
    expect(await s.alice.query(api.achRecords.mine, {})).toEqual([]);
    expect(
      (await s.t.query(internal.achRecords.identity, { userId: s.ids.alice }))
        .familyHasSetup,
    ).toBe(true);
  });
  it("does not pick among duplicate phone numbers, invent consent, or grant staff roles", async () => {
    const s = await setup();
    for (const account of [s.alice, s.bob])
      await account.mutation(api.members.save, {
        ...fields,
        phone: "2145550101",
      });
    await s.third.mutation(api.members.save, {
      ...fields,
      phone: "2145550103",
      spouseContactKind: "phone",
      spouseContact: "2145550101",
      familyConsent: true,
    });
    expect((await s.third.query(api.familyBilling.mine, {}))[0].status).toBe(
      "waiting_for_match",
    );
    await expect(
      s.third.mutation(api.familyBilling.link, {
        kind: "email",
        contact: "alice@example.com",
        consent: false,
      }),
    ).rejects.toThrow("Confirm");
    await expect(
      s.third.mutation(api.familyBilling.link, {
        kind: "email",
        contact: "third@example.com",
        consent: true,
      }),
    ).rejects.toThrow("own");
    expect((await s.third.query(api.members.me, {}))?.role).toBe("member");
    expect(await s.t.run((ctx) => ctx.db.query("roles").collect())).toEqual([]);
  });
  it("rolls back enrollment on invalid spouse consent and requires verified sign-in", async () => {
    const s = await setup();
    await expect(
      s.alice.mutation(api.members.save, {
        ...fields,
        spouseContactKind: "email",
        spouseContact: "bob@example.com",
      }),
    ).rejects.toThrow("Confirm");
    expect(await s.alice.query(api.households.mine, {})).toBeNull();
    await expect(s.t.mutation(api.members.save, fields)).rejects.toThrow(
      "sign in",
    );
  });
});
