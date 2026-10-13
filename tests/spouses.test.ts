import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { familyContact } from "../src/lib/familyContact";
import { householdMatches } from "../src/lib/householdSearch";
import { approvalStart, shiftMonth } from "../convex/ledger";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const fields = {
  name: "Synthetic member",
  phone: "",
  city: "",
  language: "en" as const,
  interests: [],
  consent: true,
};
async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const users = await Promise.all(
      ["alice", "bob", "charlie", "admin", "secretary", "treasurer"].map(
        (email) =>
          ctx.db.insert("users", {
            email: `${email}@example.com`,
            emailVerificationTime: Date.now(),
          }),
      ),
    );
    const [alice, bob, charlie, admin, secretary, treasurer] = users;
    await ctx.db.insert("roles", { userId: admin, role: "admin" });
    await ctx.db.insert("roles", { userId: secretary, role: "secretary" });
    await ctx.db.insert("roles", { userId: treasurer, role: "treasurer" });
    return { alice, bob, charlie, admin, secretary, treasurer };
  });
  const alice = t.withIdentity({ subject: ids.alice }),
    bob = t.withIdentity({ subject: ids.bob }),
    charlie = t.withIdentity({ subject: ids.charlie });
  const admin = t.withIdentity({ subject: ids.admin }),
    secretary = t.withIdentity({ subject: ids.secretary }),
    treasurer = t.withIdentity({ subject: ids.treasurer });
  await alice.mutation(api.members.save, {
    ...fields,
    name: "Alice",
    phone: "2145550101",
  });
  await bob.mutation(api.members.save, {
    ...fields,
    name: "Bob",
    phone: "2145550102",
  });
  await charlie.mutation(api.members.save, { ...fields, name: "Charlie" });
  const a = (await alice.query(api.households.mine, {}))!.household._id,
    b = (await bob.query(api.households.mine, {}))!.household._id;
  return { t, ids, alice, bob, charlie, admin, secretary, treasurer, a, b };
}
async function invite(s: Awaited<ReturnType<typeof setup>>) {
  return s.alice.mutation(api.spouses.request, {
    kind: "email",
    contact: " BOB@EXAMPLE.COM ",
    consent: true,
  });
}
async function reviewedPair() {
  const s = await setup();
  await s.admin.mutation(api.households.approve, { id: s.a });
  await s.admin.mutation(api.households.approve, { id: s.b });
  const id = await invite(s);
  expect(
    await s.bob.mutation(api.spouses.respond, {
      id,
      accept: true,
      consent: true,
    }),
  ).toBe("household_review");
  return { ...s, id };
}
describe("Private spouse connections and one family obligation", () => {
  it("normalizes email and phone without accepting ambiguous or malformed contacts", () => {
    expect(familyContact("email", " Bob@EXAMPLE.COM ")).toBe("bob@example.com");
    expect(familyContact("phone", "(214) 555-0102")).toBe("+12145550102");
    expect(familyContact("phone", "+251 911 123456")).toBe("+251911123456");
    for (const bad of ["911123456", "abc", "+000123456", "++12145550102"]) {
      expect(() => familyContact("phone", bad)).toThrow();
    }
    expect(() => familyContact("email", "bad email")).toThrow();
  });
  it("finds a shared family using either spouse's name, email or formatted phone", () => {
    const h = {
      name: "Alice family",
      phone: "",
      linkedAccounts: [
        {
          name: "Bob member",
          email: "bob@example.com",
          phone: "(214) 555-0102",
        },
      ],
    };
    for (const text of [
      "Alice",
      "Bob member",
      "BOB@EXAMPLE.COM",
      "214-555-0102",
    ])
      expect(householdMatches(h, text)).toBe(true);
    expect(householdMatches(h, "Charlie")).toBe(false);
  });
  it("requires verified identity, consent and another person's contact", async () => {
    const s = await setup();
    await expect(s.t.query(api.spouses.mine, {})).rejects.toThrow("sign in");
    await expect(s.t.query(api.spouses.history, {})).rejects.toThrow("sign in");
    await expect(
      s.alice.mutation(api.spouses.request, {
        kind: "email",
        contact: "bob@example.com",
        consent: false,
      }),
    ).rejects.toThrow("Confirm");
    await expect(
      s.alice.mutation(api.spouses.request, {
        kind: "email",
        contact: "alice@example.com",
        consent: true,
      }),
    ).rejects.toThrow("own");
    await expect(
      s.alice.mutation(api.spouses.request, {
        kind: "phone",
        contact: "2145550101",
        consent: true,
      }),
    ).rejects.toThrow("own");
    const u = await s.t.run((ctx) =>
      ctx.db.insert("users", { email: "unverified@example.com" }),
    );
    await expect(
      s.t.withIdentity({ subject: u }).query(api.spouses.mine, {}),
    ).rejects.toThrow("verify");
  });
  it("does not disclose account existence, names or another person's requests", async () => {
    const s = await setup(),
      id = await invite(s);
    const unknown = await s.alice.mutation(api.spouses.request, {
      kind: "email",
      contact: "unknown@example.com",
      consent: true,
    });
    expect(
      (await s.alice.query(api.spouses.mine, {})).every(
        (r) => !r.peerName && r.status === "pending",
      ),
    ).toBe(true);
    expect(await s.charlie.query(api.spouses.mine, {})).toEqual([]);
    expect((await s.bob.query(api.spouses.mine, {}))[0].peerName).toBe("Alice");
    await expect(
      s.charlie.mutation(api.spouses.respond, {
        id,
        accept: true,
        consent: true,
      }),
    ).rejects.toThrow("unavailable");
    await expect(
      s.charlie.mutation(api.spouses.cancel, { id: unknown }),
    ).rejects.toThrow("Only");
    await s.bob.mutation(api.spouses.respond, {
      id,
      accept: false,
      consent: false,
    });
    expect(
      (await s.alice.query(api.spouses.mine, {})).find((r) => r.id === id)
        ?.peerName,
    ).toBeUndefined();
  });
  it("deduplicates repeated requests and limits spam", async () => {
    const s = await setup(),
      id = await invite(s);
    expect(await invite(s)).toBe(id);
    for (let i = 0; i < 3; i++)
      await s.alice.mutation(api.spouses.request, {
        kind: "email",
        contact: `unknown${i}@example.com`,
        consent: true,
      });
    await expect(invite(s)).rejects.toThrow();
  });
  it("requires recipient consent, rejects expired requests and allows cancellation", async () => {
    const s = await setup(),
      id = await invite(s);
    await expect(
      s.bob.mutation(api.spouses.respond, { id, accept: true, consent: false }),
    ).rejects.toThrow("Confirm");
    expect((await s.bob.query(api.households.mine, {}))!.household._id).toBe(
      s.b,
    );
    await s.t.run((ctx) => ctx.db.patch(id, { expiresAt: Date.now() - 1 }));
    await expect(
      s.bob.mutation(api.spouses.respond, { id, accept: true, consent: true }),
    ).rejects.toThrow("expired");
    await s.alice.mutation(api.spouses.cancel, { id });
    expect((await s.alice.query(api.spouses.mine, {}))[0].status).toBe(
      "cancelled",
    );
  });
  it("links empty applications only after both confirmations and bills once for both spouses", async () => {
    const s = await setup(),
      id = await invite(s);
    expect(
      await s.bob.mutation(api.spouses.respond, {
        id,
        accept: true,
        consent: true,
      }),
    ).toBe("linked");
    expect((await s.bob.query(api.households.mine, {}))!.household._id).toBe(
      s.a,
    );
    const family = (await s.admin.query(api.households.list, {})).find(
      (h) => h._id === s.a,
    )!;
    expect(family.linkedAccounts.map((a) => a.email).sort()).toEqual([
      "alice@example.com",
      "bob@example.com",
    ]);
    await s.bob.mutation(api.members.save, { ...fields, name: "Bob updated" });
    expect((await s.alice.query(api.households.mine, {}))!.household.name).toBe(
      "Alice",
    );
    await s.admin.mutation(api.households.approve, { id: s.a });
    const dues = (await s.alice.query(api.households.mine, {}))!.dues;
    expect(dues).toHaveLength(12);
    expect(dues.every((d) => d.amountCents === 2000)).toBe(true);
    await s.admin.mutation(api.finance.recordReceipt, {
      householdId: s.a,
      date: "2026-10-13",
      duesCents: 24000,
      giftCents: 0,
      giftFund: "general",
      method: "cash",
      reference: "SYNTHETIC-FAMILY-YEAR",
      requestId: "synthetic-family-year",
      months: 12,
    });
    for (const member of [s.alice, s.bob]) {
      const h = (await member.query(api.households.mine, {}))!;
      expect(h.dues.every((d) => d.paidCents === 2000)).toBe(true);
      expect(h.receipts).toHaveLength(1);
      expect((await member.query(api.members.me, {}))!.role).toBe("member");
    }
    await s.t.mutation(internal.households.extendDues, { cursor: null });
    expect((await s.alice.query(api.households.mine, {}))!.dues).toHaveLength(
      12,
    );
    await expect(s.alice.mutation(api.spouses.cancel, { id })).rejects.toThrow(
      "linked",
    );
    await expect(s.alice.query(api.spouses.officeQueue, {})).rejects.toThrow(
      "permission",
    );
  });
  it("preserves personal giving privacy and refuses another simultaneous spouse", async () => {
    const s = await setup(),
      id = await invite(s);
    await s.bob.mutation(api.spouses.respond, {
      id,
      accept: true,
      consent: true,
    });
    await s.alice.mutation(api.donations.reportZelle, {
      amountCents: 1000,
      fund: "general",
      giftDate: "2026-10-13",
      reference: "synthetic-private-gift",
      requestId: "synthetic-private-gift",
    });
    expect(await s.bob.query(api.donations.mine, {})).toEqual([]);
    await expect(
      s.bob.mutation(api.spouses.request, {
        kind: "email",
        contact: "charlie@example.com",
        consent: true,
      }),
    ).rejects.toThrow("already");
  });
  it("prefers the already approved household without moving its payments", async () => {
    const s = await setup();
    await s.admin.mutation(api.households.approve, { id: s.b });
    const id = await invite(s);
    await s.bob.mutation(api.spouses.respond, {
      id,
      accept: true,
      consent: true,
    });
    expect((await s.alice.query(api.households.mine, {}))!.household._id).toBe(
      s.b,
    );
    expect((await s.alice.query(api.households.mine, {}))!.dues).toHaveLength(
      12,
    );
  });
  it("never trusts an editable phone and requires office verification plus recipient consent", async () => {
    const s = await setup();
    const id = await s.alice.mutation(api.spouses.request, {
      kind: "phone",
      contact: "2145550102",
      consent: true,
    });
    expect(await s.bob.query(api.spouses.mine, {})).toEqual([]);
    await expect(
      s.alice.mutation(api.spouses.verifyPhone, {
        id,
        recipientEmail: "bob@example.com",
        verified: true,
        reference: "Test verification",
      }),
    ).rejects.toThrow("permission");
    await expect(
      s.secretary.mutation(api.spouses.verifyPhone, {
        id,
        recipientEmail: "bob@example.com",
        verified: false,
        reference: "Test verification",
      }),
    ).rejects.toThrow("Confirm");
    await s.secretary.mutation(api.spouses.verifyPhone, {
      id,
      recipientEmail: "bob@example.com",
      verified: true,
      reference: "Synthetic independent verification",
    });
    expect((await s.bob.query(api.spouses.mine, {}))[0].status).toBe("pending");
    expect((await s.bob.query(api.households.mine, {}))!.household._id).toBe(
      s.b,
    );
    await s.bob.mutation(api.spouses.respond, {
      id,
      accept: true,
      consent: true,
    });
    expect((await s.bob.query(api.households.mine, {}))!.household._id).toBe(
      s.a,
    );
  });
  it("preserves approved records for review; either spouse can withdraw that uncompleted connection", async () => {
    const s = await reviewedPair();
    expect((await s.bob.query(api.households.mine, {}))!.household._id).toBe(
      s.b,
    );
    expect(
      (await s.admin.query(api.spouses.officeQueue, {})).rows[0].status,
    ).toBe("household_review");
    await s.bob.mutation(api.spouses.cancel, { id: s.id });
    expect((await s.alice.query(api.spouses.mine, {}))[0].status).toBe(
      "cancelled",
    );
  });
  it("audits future duplicate assessment reversals without deleting history or assessing a second family fee", async () => {
    const s = await reviewedPair();
    await expect(
      s.treasurer.mutation(api.spouses.finalizeReviewed, {
        id: s.id,
        primary: "sender",
        reviewed: true,
        reference: "Test review",
      }),
    ).rejects.toThrow("permission");
    await s.secretary.mutation(api.spouses.finalizeReviewed, {
      id: s.id,
      primary: "sender",
      reviewed: true,
      reference: "Synthetic balanced review",
    });
    expect((await s.bob.query(api.households.mine, {}))!.household._id).toBe(
      s.a,
    );
    const original = await s.t.run((ctx) =>
      ctx.db
        .query("duesCharges")
        .withIndex("by_household_month", (q) => q.eq("householdId", s.b))
        .collect(),
    );
    expect(original).toHaveLength(12);
    expect(original.every((c) => c.cancelledBy)).toBe(true);
    const journals = await s.t.run((ctx) => ctx.db.query("journals").collect());
    expect(journals.filter((j) => j.reversalOf)).toHaveLength(12);
    expect(await s.alice.query(api.spouses.history, {})).toHaveLength(0);
    expect(await s.bob.query(api.spouses.history, {})).toHaveLength(1);
    expect(
      (await s.bob.query(api.members.exportMine, {})).formerHouseholdRecords,
    ).toHaveLength(1);
    await s.t.mutation(internal.households.extendDues, { cursor: null });
    expect((await s.bob.query(api.households.mine, {}))!.dues).toHaveLength(12);
    expect(
      (await s.admin.query(api.households.list, {})).find((h) => h._id === s.b)
        ?.status,
    ).toBe("inactive");
  });
  it.each([1, 12])(
    "blocks prepaid or unapplied secondary dues (allocation months %i) without losing credit",
    async (months) => {
      const s = await reviewedPair();
      await s.admin.mutation(api.finance.recordReceipt, {
        householdId: s.b,
        date: "2026-10-13",
        duesCents: 24000,
        giftCents: 0,
        giftFund: "general",
        method: "cash",
        reference: "SYNTHETIC-PREPAID",
        requestId: "synthetic-prepaid",
        months,
      });
      await expect(
        s.admin.mutation(api.spouses.finalizeReviewed, {
          id: s.id,
          primary: "sender",
          reviewed: true,
          reference: "Test review",
        }),
      ).rejects.toThrow(months === 1 ? "unapplied" : "prepaid");
      expect((await s.bob.query(api.households.mine, {}))!.household._id).toBe(
        s.b,
      );
      expect(
        (await s.bob.query(api.households.mine, {}))!.receipts,
      ).toHaveLength(1);
    },
  );
  it("rejects historical unpaid balances, extra linked accounts and stale requesting households", async () => {
    const s = await reviewedPair();
    const first = (await s.bob.query(api.households.mine, {}))!.dues[0];
    await s.t.run((ctx) => ctx.db.patch(first._id, { month: "2020-01" }));
    await expect(
      s.admin.mutation(api.spouses.finalizeReviewed, {
        id: s.id,
        primary: "sender",
        reviewed: true,
        reference: "Test review",
      }),
    ).rejects.toThrow("historical");
    await s.t.run((ctx) =>
      ctx.db.patch(first._id, { month: approvalStart(Date.now()) }),
    );
    const extra = await s.t.run((ctx) =>
      ctx.db.insert("householdLinks", {
        userId: s.ids.charlie,
        householdId: s.a,
        linkedBy: s.ids.admin,
        createdAt: Date.now(),
      }),
    );
    await expect(
      s.admin.mutation(api.spouses.finalizeReviewed, {
        id: s.id,
        primary: "sender",
        reviewed: true,
        reference: "Test review",
      }),
    ).rejects.toThrow("Other accounts");
    await s.t.run(async (ctx) => {
      await ctx.db.delete(extra);
      await ctx.db.patch(s.id, { senderHouseholdId: s.b });
    });
    await expect(
      s.admin.mutation(api.spouses.finalizeReviewed, {
        id: s.id,
        primary: "sender",
        reviewed: true,
        reference: "Test review",
      }),
    ).rejects.toThrow("changed");
  });
  it("retains paid past records privately while cancelling only future duplicates", async () => {
    const s = await reviewedPair();
    const first = (await s.bob.query(api.households.mine, {}))!.dues[0];
    const past = shiftMonth(approvalStart(Date.now()), -2);
    await s.t.run(async (ctx) => {
      await ctx.db.patch(s.b, { duesStart: past });
      await ctx.db.patch(first._id, { month: past });
      await ctx.db.patch(first.journalId, { date: `${past}-01` });
    });
    await s.admin.mutation(api.finance.recordReceipt, {
      householdId: s.b,
      date: `${past}-15`,
      duesCents: 2000,
      giftCents: 0,
      giftFund: "general",
      method: "cash",
      reference: "SYNTHETIC-PAST",
      requestId: "synthetic-past",
      firstMonth: past,
      months: 1,
    });
    await s.admin.mutation(api.spouses.finalizeReviewed, {
      id: s.id,
      primary: "sender",
      reviewed: true,
      reference: "Synthetic past review",
    });
    const own = await s.bob.query(api.spouses.history, {});
    expect(own[0].receipts).toHaveLength(1);
    expect(own[0].receipts[0].duesCents).toBe(2000);
    expect(own[0].charges.filter((c) => c.cancelledBy)).toHaveLength(11);
    expect(await s.alice.query(api.spouses.history, {})).toEqual([]);
    expect((await s.alice.query(api.households.mine, {}))!.receipts).toEqual(
      [],
    );
    expect(
      (await s.alice.query(api.members.exportMine, {})).formerHouseholdRecords,
    ).toEqual([]);
  });
  it("blocks active secondary bank instructions and never shares bank request details with the spouse", async () => {
    const s = await reviewedPair();
    const bank = await s.t.run((ctx) =>
      ctx.db.insert("achRequests", {
        userId: s.ids.bob,
        householdId: s.b,
        encryptedDetails: "synthetic-encrypted-placeholder",
        lastFour: "6789",
        accountHolder: "Synthetic member",
        bankName: "Synthetic bank",
        accountType: "checking",
        ownership: "personal",
        frequency: "monthly",
        amountCents: 2000,
        consentVersion: "test",
        consentText: "Synthetic notice",
        status: "submitted",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await expect(
      s.admin.mutation(api.spouses.finalizeReviewed, {
        id: s.id,
        primary: "sender",
        reviewed: true,
        reference: "Synthetic bank review",
      }),
    ).rejects.toThrow("Chase instructions");
    await s.bob.mutation(api.achRecords.withdraw, { id: bank });
    await s.admin.mutation(api.spouses.finalizeReviewed, {
      id: s.id,
      primary: "sender",
      reviewed: true,
      reference: "Synthetic bank review",
    });
    expect(await s.alice.query(api.achRecords.mine, {})).toEqual([]);
    expect(
      JSON.stringify(await s.bob.query(api.achRecords.mine, {})),
    ).not.toContain("synthetic-encrypted-placeholder");
    await expect(
      s.admin.mutation(api.households.approve, { id: s.b }),
    ).rejects.toThrow("inactive");
  });
});
