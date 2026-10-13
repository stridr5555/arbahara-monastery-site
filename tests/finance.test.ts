import { convexTest } from "convex-test";
import { describe, it, expect, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { approvalStart } from "../convex/ledger";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const admin = await ctx.db.insert("users", {
        email: "admin@example.com",
        emailVerificationTime: Date.now(),
      }),
      alice = await ctx.db.insert("users", {
        email: "alice@example.com",
        emailVerificationTime: Date.now(),
      }),
      bob = await ctx.db.insert("users", {
        email: "bob@example.com",
        emailVerificationTime: Date.now(),
      });
    await ctx.db.insert("roles", { userId: admin, role: "admin" });
    return { admin, alice, bob };
  });
  return {
    t,
    ids,
    admin: t.withIdentity({ subject: ids.admin }),
    alice: t.withIdentity({ subject: ids.alice }),
    bob: t.withIdentity({ subject: ids.bob }),
  };
}
describe("Household and accounting boundaries", () => {
  it("blocks test-key checkout outside explicitly enabled sandbox mode", async () => {
    const { t, alice } = await setup();
    try {
      vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_unusable");
      vi.stubEnv("APPROVED_STRIPE_ACCOUNT_ID", "acct_example");
      vi.stubEnv("STRIPE_WEBHOOK_SECRET", "example");
      vi.stubEnv("PAYMENTS_TEST_MODE", "false");
      vi.stubEnv("CARD_PAYMENTS_DISABLED", "false");
      expect((await t.query(api.paymentRecords.availability, {})).card).toBe(
        false,
      );
      await expect(
        alice.action(api.payments.checkout, {
          amountCents: 2000,
          fund: "general",
          frequency: "once",
          requestId: "production-payment-guard",
        }),
      ).rejects.toThrow("not activated");
      expect(
        await t.run((ctx) => ctx.db.query("donations").collect()),
      ).toHaveLength(0);
      vi.stubEnv("PAYMENTS_TEST_MODE", "true");
      expect((await t.query(api.paymentRecords.availability, {})).card).toBe(
        true,
      );
      vi.stubEnv("CARD_PAYMENTS_DISABLED", "true");
      expect((await t.query(api.paymentRecords.availability, {})).card).toBe(
        false,
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("consolidates only a reviewed unapproved spouse application without moving financial history", async () => {
    const { admin, alice } = await setup();
    await alice.mutation(api.members.save, {
      name: "Alice application",
      phone: "",
      city: "",
      language: "en",
      interests: [],
      consent: true,
    });
    const target = await admin.mutation(api.households.create, {
      name: "Existing family",
      phone: "",
      address: "",
      exempt: false,
    });
    await admin.mutation(api.households.approve, { id: target });
    await expect(
      admin.mutation(api.households.linkAccount, {
        id: target,
        email: "alice@example.com",
      }),
    ).rejects.toThrow("explicitly reviewed");
    await admin.mutation(api.households.linkAccount, {
      id: target,
      email: "alice@example.com",
      reviewPendingApplication: true,
    });
    expect((await alice.query(api.households.mine, {}))?.household._id).toBe(
      target,
    );
    expect(
      (await admin.query(api.households.list, {})).filter(
        (h) => h.status === "active",
      ),
    ).toHaveLength(1);
    expect((await alice.query(api.households.mine, {}))?.dues).toHaveLength(12);
  });
  it("keeps excess dues unapplied until reviewed coverage and safely extends the rolling horizon", async () => {
    const { admin, t, alice } = await setup();
    await alice.mutation(api.members.save, {
      name: "Alice",
      phone: "",
      city: "",
      language: "en",
      interests: [],
      consent: true,
    });
    const id = (await admin.query(api.households.list, {}))[0]._id;
    await admin.mutation(api.households.approve, { id });
    const start = (await alice.query(api.households.mine, {}))!.household
      .duesStart!;
    const receipt = await admin.mutation(api.finance.recordReceipt, {
      householdId: id,
      date: "2026-01-01",
      duesCents: 24000,
      giftCents: 0,
      giftFund: "general",
      method: "cash",
      reference: "EXCESS-TEST",
      requestId: "excess-test",
      months: 1,
    });
    expect(
      (await admin.query(api.finance.dashboard, { through: "2029-01-01" }))
        .receipts[0].unappliedCents,
    ).toBe(22000);
    await admin.mutation(api.finance.allocateUnapplied, {
      id: receipt,
      firstMonth: start,
      months: 12,
    });
    expect(
      (await alice.query(api.households.mine, {}))?.dues.every(
        (d) => d.paidCents === 2000,
      ),
    ).toBe(true);
    await expect(
      admin.mutation(api.finance.allocateUnapplied, {
        id: receipt,
        firstMonth: start,
        months: 12,
      }),
    ).rejects.toThrow("no unapplied");
    await t.mutation(internal.households.extendDues, { cursor: null });
    expect((await alice.query(api.households.mine, {}))?.dues).toHaveLength(12);
  });
  it("creates one pending household per account and keeps records private", async () => {
    const { alice, bob, admin } = await setup();
    const fields = {
      name: "Alice household",
      phone: "",
      city: "",
      language: "en" as const,
      interests: [],
      consent: true,
    };
    await alice.mutation(api.members.save, fields);
    await alice.mutation(api.members.save, {
      ...fields,
      name: "Alice updated",
    });
    expect(await admin.query(api.households.list, {})).toHaveLength(1);
    expect((await admin.query(api.households.list, {}))[0].name).toBe(
      "Alice updated",
    );
    expect((await alice.query(api.households.mine, {}))?.household.status).toBe(
      "pending",
    );
    expect(await bob.query(api.households.mine, {})).toBe(null);
    await expect(
      bob.query(api.finance.dashboard, { through: "2026-12-31" }),
    ).rejects.toThrow("permission");
  });
  it("approves independently of payment and never charges an exempt household", async () => {
    const { admin } = await setup();
    const id = await admin.mutation(api.households.create, {
      name: "Exempt household",
      phone: "",
      address: "",
      exempt: true,
    });
    await admin.mutation(api.households.approve, { id });
    const household = (await admin.query(api.households.list, {}))[0];
    expect(household.status).toBe("active");
    expect(household.duesStart).toBe(approvalStart(Date.now()));
    await expect(
      admin.mutation(api.households.assess, {
        id,
        month: household.duesStart!,
      }),
    ).rejects.toThrow("cannot be charged");
    expect(
      (await admin.query(api.finance.dashboard, { through: "2029-01-01" }))
        .journals,
    ).toHaveLength(0);
  });
  it("allocates annual and partial collections, tracks extra giving separately, and reverses without deletion", async () => {
    const { admin, alice } = await setup();
    await alice.mutation(api.members.save, {
      name: "Alice",
      phone: "",
      city: "",
      language: "en",
      interests: [],
      consent: true,
    });
    const id = (await admin.query(api.households.list, {}))[0]._id;
    await admin.mutation(api.households.approve, { id });
    const before = (await alice.query(api.households.mine, {}))!;
    expect(before.dues).toHaveLength(12);
    // Collections use the church's civil date, not tomorrow's UTC date after 7 p.m.
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en", {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(new Date())
        .map((p) => [p.type, p.value]),
    );
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    const input = {
      householdId: id,
      date,
      duesCents: 24000,
      giftCents: 5000,
      giftFund: "construction" as const,
      method: "zelle" as const,
      reference: "BANK-ANNUAL-1",
      requestId: "annual-request-0001",
      months: 12,
    };
    const receipt = await admin.mutation(api.finance.recordReceipt, input);
    expect(await admin.mutation(api.finance.recordReceipt, input)).toBe(
      receipt,
    );
    const paid = (await alice.query(api.households.mine, {}))!;
    expect(paid.dues.every((d) => d.paidCents === 2000)).toBe(true);
    expect(paid.receipts[0].giftCents).toBe(5000);
    await expect(
      admin.mutation(api.finance.recordReceipt, {
        ...input,
        requestId: "different-request",
      }),
    ).rejects.toThrow("Reference already");
    await admin.mutation(api.finance.reverseReceipt, {
      id: receipt,
      date,
      reason: "Bank returned collection",
    });
    const undone = (await alice.query(api.households.mine, {}))!;
    expect(undone.dues.every((d) => d.paidCents === 0)).toBe(true);
    expect(undone.receipts[0].reversedBy).toBeTruthy();
    const partial = await admin.mutation(api.finance.recordReceipt, {
      ...input,
      duesCents: 1000,
      giftCents: 0,
      reference: "PARTIAL-1",
      requestId: "partial-request-001",
      months: 1,
    });
    expect(partial).toBeTruthy();
    expect(
      (await alice.query(api.households.mine, {}))?.dues[0].paidCents,
    ).toBe(1000);
  });
  it("does not book future dues as present revenue or count bank transfers as donations", async () => {
    const { admin } = await setup();
    const id = await admin.mutation(api.households.create, {
      name: "New household",
      phone: "",
      address: "",
      exempt: false,
    });
    await admin.mutation(api.households.approve, { id });
    const date = new Date().toISOString().slice(0, 10);
    const report = await admin.query(api.finance.dashboard, { through: date });
    expect(report.balances.every((a) => a.balanceCents === 0)).toBe(true);
    const lines = [
      { account: "1000", fund: "general", debitCents: 10000, creditCents: 0 },
      { account: "1010", fund: "general", debitCents: 0, creditCents: 10000 },
    ];
    await admin.mutation(api.finance.post, {
      date,
      description: "Deposit cash into bank",
      reference: "DEP-1",
      requestId: "deposit-request-001",
      lines,
    });
    const after = await admin.query(api.finance.dashboard, { through: date });
    expect(after.balances.find((a) => a.code === "4100")?.balanceCents).toBe(0);
  });
  it("locks closed periods and records audited open-period adjustments", async () => {
    const { admin } = await setup();
    await admin.mutation(api.finance.closePeriod, {
      month: "2025-12",
      confirm: true,
    });
    const args = {
      date: "2025-12-31",
      description: "Opening balances",
      reference: "OPEN-1",
      requestId: "opening-request-001",
      lines: [
        { account: "1000", fund: "general", debitCents: 10000, creditCents: 0 },
        { account: "3000", fund: "general", debitCents: 0, creditCents: 10000 },
      ],
    };
    await expect(admin.mutation(api.finance.post, args)).rejects.toThrow(
      "closed",
    );
    const journal = await admin.mutation(api.finance.post, {
      ...args,
      date: "2026-01-01",
    });
    await admin.mutation(api.finance.reverse, {
      id: journal,
      date: "2026-01-02",
      reason: "Correct opening balance",
    });
    expect(
      (
        await admin.query(api.finance.dashboard, { through: "2026-01-02" })
      ).balances.every((a) => a.balanceCents === 0),
    ).toBe(true);
  });
  it("invites the secretary by verified email without allowing privilege escalation", async () => {
    const { admin, bob } = await setup();
    const id = await admin.mutation(api.households.inviteStaff, {
      email: "bob@example.com",
      role: "secretary",
    });
    expect((await bob.query(api.members.me, {}))?.role).toBe("secretary");
    await bob.query(api.households.list, {});
    await expect(
      bob.mutation(api.households.inviteStaff, {
        email: "someone@example.com",
        role: "treasurer",
      }),
    ).rejects.toThrow("permission");
    await admin.mutation(api.households.revokeInvitation, { id });
    await expect(bob.query(api.households.list, {})).rejects.toThrow(
      "permission",
    );
  });
  it("uses cards for new Stripe records but retains legacy subscription renewals as ACH", async () => {
    const { t, ids } = await setup();
    const id = await t.mutation(internal.donations.beginCheckout, {
      userId: ids.alice,
      amountCents: 2000,
      fund: "general",
      frequency: "once",
      requestId: "card-checkout-request-01",
    });
    expect(await t.run(async (ctx) => (await ctx.db.get(id))?.method)).toBe(
      "card",
    );
    expect((await t.query(api.paymentRecords.availability, {})).ach).toBe(
      false,
    );
    for (const method of ["card", "ach"]) {
      await t.mutation(internal.paymentRecords.apply, {
        eventId: `evt-${method}`,
        eventCreated: 1791800000,
        payload: {
          kind: "invoice",
          type: "invoice.paid",
          userId: ids.alice,
          amountCents: 2000,
          fund: "general",
          subscriptionId: `sub-${method}`,
          invoiceId: `in-${method}`,
          method,
          initial: false,
        },
      });
    }
    const records = await t.run((ctx) => ctx.db.query("donations").collect());
    expect(records.find((d) => d.invoiceId === "in-card")?.method).toBe("card");
    expect(records.find((d) => d.invoiceId === "in-ach")?.method).toBe("ach");
  });
});
