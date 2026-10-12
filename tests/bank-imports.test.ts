import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const admin = await ctx.db.insert("users", {
        email: "office@example.com",
        emailVerificationTime: Date.now(),
      }),
      member = await ctx.db.insert("users", {
        email: "member@example.com",
        emailVerificationTime: Date.now(),
      });
    await ctx.db.insert("roles", { userId: admin, role: "admin" });
    return { admin, member };
  });
  return {
    t,
    ids,
    admin: t.withIdentity({ subject: ids.admin }),
    member: t.withIdentity({ subject: ids.member }),
  };
}
describe("Bank reconciliation safeguards", () => {
  it("keeps credentials private, matches without income, and invalidates a match on reversal", async () => {
    const { t, ids, admin, member } = await setup();
    const id = await t.mutation(internal.bankRecords.save, {
      owner: ids.admin,
      institution: "Test-only bank",
      encryptedToken: "encrypted-test-grant",
    });
    await t.mutation(internal.bankRecords.applySync, {
      id,
      nextCursor: "one",
      changes: [
        {
          providerId: "txn1",
          accountId: "account",
          date: "2026-10-01",
          name: "Cash deposit",
          amountCents: -10000,
          pending: false,
        },
      ],
      removedIds: [],
    });
    await expect(member.query(api.bankRecords.rows, { id })).rejects.toThrow(
      "permission",
    );
    expect(
      JSON.stringify(await admin.query(api.bankRecords.status, {})),
    ).not.toContain("encrypted-test-grant");
    const journalId = await admin.mutation(api.finance.post, {
      date: "2026-10-01",
      description: "Cash transfer",
      reference: "BANK-TEST",
      requestId: "bank-test-1",
      lines: [
        { account: "1000", fund: "general", debitCents: 10000, creditCents: 0 },
        { account: "1010", fund: "general", debitCents: 0, creditCents: 10000 },
      ],
    });
    const txn = (await admin.query(api.bankRecords.rows, { id }))[0];
    await admin.mutation(api.bankRecords.match, { id: txn._id, journalId });
    expect(
      (await admin.query(api.finance.dashboard, { through: "2026-10-12" }))
        .journals,
    ).toHaveLength(1);
    expect(
      (await admin.query(api.bankRecords.rows, { id }))[0].matchedJournalId,
    ).toBe(journalId);
    await admin.mutation(api.finance.reverse, {
      id: journalId,
      date: "2026-10-02",
      reason: "Correction",
    });
    expect(
      (await admin.query(api.bankRecords.rows, { id }))[0].matchedJournalId,
    ).toBeUndefined();
  });
  it("rejects stale cursor pages atomically and preserves removed bank history", async () => {
    const { t, ids, admin } = await setup();
    const id = await t.mutation(internal.bankRecords.save, {
      owner: ids.admin,
      institution: "Test bank",
      encryptedToken: "test",
    });
    const change = {
      providerId: "txn2",
      accountId: "account",
      date: "2026-10-01",
      name: "Expense",
      amountCents: 2500,
      pending: false,
    };
    await t.mutation(internal.bankRecords.applySync, {
      id,
      nextCursor: "saved",
      changes: [change],
      removedIds: [],
    });
    await expect(
      t.mutation(internal.bankRecords.applySync, {
        id,
        expectedCursor: "stale",
        nextCursor: "bad",
        changes: [{ ...change, amountCents: 9000 }],
        removedIds: [],
      }),
    ).rejects.toThrow("changed during sync");
    expect(
      (await admin.query(api.bankRecords.rows, { id }))[0].amountCents,
    ).toBe(2500);
    await t.mutation(internal.bankRecords.applySync, {
      id,
      expectedCursor: "saved",
      nextCursor: "next",
      changes: [],
      removedIds: ["txn2"],
    });
    expect((await admin.query(api.bankRecords.rows, { id }))[0].removed).toBe(
      true,
    );
    await t.mutation(internal.bankRecords.disconnect, { id, actor: ids.admin });
    expect(
      (await t.query(internal.bankRecords.grant, { id }))?.encryptedToken,
    ).toBeUndefined();
  });
});
describe("Staged roster recovery", () => {
  it("rejects duplicate contacts and repeat imports, requires review, and retains recovery provenance", async () => {
    const { admin, t } = await setup();
    const row = {
        row: 2,
        name: "Test household",
        email: "test@example.com",
        phone: "",
        address: "",
        exempt: true,
      },
      base = {
        fileName: "test-only.csv",
        sheetName: "Roster",
        fingerprint: "a".repeat(64),
      };
    await expect(
      admin.mutation(api.imports.stage, {
        ...base,
        rows: [row, { ...row, row: 3, name: "Other name" }],
      }),
    ).rejects.toThrow("Duplicate");
    const id = await admin.mutation(api.imports.stage, {
      ...base,
      rows: [row],
    });
    await expect(
      admin.mutation(api.imports.stage, { ...base, rows: [row] }),
    ).rejects.toThrow("already staged");
    await expect(
      admin.mutation(api.imports.commit, { id, confirmed: false }),
    ).rejects.toThrow("Confirm");
    await admin.mutation(api.imports.commit, { id, confirmed: true });
    const household = (await admin.query(api.households.list, {}))[0];
    expect(household.exempt).toBe(true);
    expect(household.status).toBe("pending");
    await admin.mutation(api.imports.recover, { id, reason: "Test recovery" });
    expect((await admin.query(api.households.list, {}))[0].status).toBe(
      "inactive",
    );
    expect(
      (await t.run((ctx) => ctx.db.query("audit").collect())).some(
        (entry) => entry.action === "roster-import.recovered",
      ),
    ).toBe(true);
  });
});
