import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { duesPayload, emptyDuesAnswer } from "../src/portal/DuesDeclaration";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const fields = {
  name: "Synthetic prior-dues family",
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
    const member = await ctx.db.insert("users", {
      email: "dues-member@example.invalid",
      emailVerificationTime: Date.now(),
    });
    const other = await ctx.db.insert("users", {
      email: "dues-other@example.invalid",
      emailVerificationTime: Date.now(),
    });
    const secretary = await ctx.db.insert("users", {
      email: "dues-office@example.invalid",
      emailVerificationTime: Date.now(),
    });
    const checkin = await ctx.db.insert("users", {
      email: "dues-checkin@example.invalid",
      emailVerificationTime: Date.now(),
    });
    await ctx.db.insert("roles", { userId: secretary, role: "secretary" });
    await ctx.db.insert("roles", { userId: checkin, role: "checkin" });
    return { member, other, secretary, checkin };
  });
  return {
    t,
    ids,
    member: t.withIdentity({ subject: ids.member }),
    other: t.withIdentity({ subject: ids.other }),
    office: t.withIdentity({ subject: ids.secretary }),
    checkin: t.withIdentity({ subject: ids.checkin }),
  };
}
const paid = {
  answer: "yes" as const,
  method: "zelle" as const,
  amountCents: 24000,
  date: "2025-01-12",
  coverage: "January–December 2025, yearly",
  reference: "Synthetic Zelle reference",
};
describe("Previous dues declarations", () => {
  it.each(["zelle", "check", "cash"] as const)(
    "saves %s on immediate enrollment without creating a receipt or collection",
    async (method) => {
      const s = await setup();
      await s.member.mutation(api.members.save, {
        ...fields,
        duesDeclaration: { ...paid, method },
      });
      expect((await s.member.query(api.members.me, {}))?.profile?.status).toBe(
        "active",
      );
      expect(await s.member.query(api.duesReports.mine, {})).toMatchObject({
        ...paid,
        method,
        status: "pending",
      });
      const household = await s.member.query(api.households.mine, {});
      expect(household?.dues).toHaveLength(12);
      expect(household?.dues.every((d) => d.paidCents === 0)).toBe(true);
      expect(
        await s.t.run(async (ctx) => ({
          receipts: (await ctx.db.query("receipts").collect()).length,
          allocations: (await ctx.db.query("duesAllocations").collect()).length,
          ach: (await ctx.db.query("achRequests").collect()).length,
          donations: (await ctx.db.query("donations").collect()).length,
        })),
      ).toEqual({ receipts: 0, allocations: 0, ach: 0, donations: 0 });
      expect((await s.office.query(api.office.workQueue, {})).duesReports).toBe(
        1,
      );
      expect(
        (await s.member.query(api.members.exportMine, {})).duesDeclaration
          ?.method,
      ).toBe(method);
    },
  );
  it("records No without a review task; Unsure requests office help without blocking membership", async () => {
    const s = await setup();
    await s.member.mutation(api.members.save, {
      ...fields,
      duesDeclaration: { answer: "no" },
    });
    expect((await s.office.query(api.office.workQueue, {})).duesReports).toBe(
      0,
    );
    await s.member.mutation(api.duesReports.save, {
      declaration: { answer: "unsure", coverage: "My spouse paid this year" },
    });
    expect(
      (await s.office.query(api.duesReports.pending, {}))[0],
    ).toMatchObject({ answer: "unsure", coverage: "My spouse paid this year" });
    expect((await s.member.query(api.members.me, {}))?.profile?.status).toBe(
      "active",
    );
  });
  it("requires verified membership and finance permission, keeping spouse billing-only reports private", async () => {
    const s = await setup();
    await expect(s.t.query(api.duesReports.mine, {})).rejects.toThrow(
      "sign in",
    );
    await expect(
      s.member.mutation(api.duesReports.save, { declaration: paid }),
    ).rejects.toThrow("registration");
    await s.member.mutation(api.members.save, {
      ...fields,
      duesDeclaration: paid,
    });
    await s.other.mutation(api.members.save, {
      ...fields,
      spouseContactKind: "email",
      spouseContact: "dues-member@example.invalid",
      familyConsent: true,
    });
    expect(await s.other.query(api.duesReports.mine, {})).toBeNull();
    expect(
      (await s.other.query(api.members.exportMine, {})).duesDeclaration,
    ).toBeNull();
    for (const client of [s.member, s.checkin]) {
      await expect(client.query(api.duesReports.pending, {})).rejects.toThrow(
        "permission",
      );
      const report = (await s.member.query(api.duesReports.mine, {}))!;
      await expect(
        client.mutation(api.duesReports.review, {
          id: report._id,
          expectedUpdatedAt: report.updatedAt,
          note: "Synthetic record",
        }),
      ).rejects.toThrow("permission");
    }
  });
  it("is retry-safe, audits staff review and reopens corrected declarations without changing the ledger", async () => {
    const s = await setup();
    await s.member.mutation(api.members.save, {
      ...fields,
      duesDeclaration: paid,
    });
    const report = (await s.member.query(api.duesReports.mine, {}))!;
    await s.member.mutation(api.duesReports.save, { declaration: paid });
    expect(await s.office.query(api.duesReports.pending, {})).toHaveLength(1);
    await s.office.mutation(api.duesReports.review, {
      id: report._id,
      expectedUpdatedAt: report.updatedAt,
      note: "Checked existing synthetic receipt; no duplicate entry.",
    });
    expect((await s.member.query(api.duesReports.mine, {}))?.status).toBe(
      "reviewed",
    );
    expect(await s.member.query(api.duesReports.mine, {})).not.toHaveProperty(
      "reviewNote",
    );
    await s.member.mutation(api.duesReports.save, { declaration: paid });
    expect(await s.office.query(api.duesReports.pending, {})).toHaveLength(0);
    await s.member.mutation(api.duesReports.save, {
      declaration: { ...paid, method: "cash" },
    });
    expect((await s.office.query(api.duesReports.pending, {}))[0]?.method).toBe(
      "cash",
    );
    await expect(
      s.office.mutation(api.duesReports.review, {
        id: report._id,
        expectedUpdatedAt: report.updatedAt,
        note: "Stale review",
      }),
    ).rejects.toThrow("changed");
    expect(
      await s.t.run(
        async (ctx) => (await ctx.db.query("receipts").collect()).length,
      ),
    ).toBe(0);
    expect(
      await s.t.run(async (ctx) =>
        (await ctx.db.query("audit").collect()).some(
          (a) => a.action === "dues.declaration-reviewed",
        ),
      ),
    ).toBe(true);
  });
  it("clears stale details when changing the answer to No", async () => {
    const s = await setup();
    await s.member.mutation(api.members.save, {
      ...fields,
      duesDeclaration: paid,
    });
    await s.member.mutation(api.duesReports.save, {
      declaration: { answer: "no" },
    });
    const report = (await s.member.query(api.duesReports.mine, {}))!;
    expect(report).toMatchObject({ answer: "no", status: "not_needed" });
    expect(report.method).toBeUndefined();
    expect(report.amountCents).toBeUndefined();
    expect(report.reference).toBeUndefined();
  });
  it.each([
    { answer: "yes" as const },
    { ...paid, amountCents: -1 },
    { ...paid, amountCents: 20.5 },
    { ...paid, amountCents: 100000001 },
    { ...paid, date: "2025-02-30" },
    { ...paid, date: "2099-01-01" },
    { ...paid, coverage: "x".repeat(241) },
    { ...paid, reference: "x".repeat(241) },
  ])("rejects invalid declarations atomically", async (duesDeclaration) => {
    const s = await setup();
    await expect(
      s.member.mutation(api.members.save, { ...fields, duesDeclaration }),
    ).rejects.toThrow();
    expect((await s.member.query(api.members.me, {}))?.profile).toBeNull();
    expect(await s.member.query(api.duesReports.mine, {})).toBeNull();
  });
  it("requires a clear form answer and strips hidden prior-payment fields", () => {
    expect(() => duesPayload(emptyDuesAnswer)).toThrow("Tell us");
    expect(
      duesPayload({
        ...emptyDuesAnswer,
        answer: "no",
        amount: "invalid",
        method: "zelle",
      }),
    ).toEqual({ answer: "no" });
    expect(
      duesPayload({
        ...emptyDuesAnswer,
        answer: "yes",
        method: "check",
        amount: "240.00",
      }),
    ).toMatchObject({ amountCents: 24000 });
    expect(() =>
      duesPayload({
        ...emptyDuesAnswer,
        answer: "yes",
        method: "cash",
        amount: "20.345",
      }),
    ).toThrow("decimal");
  });
});
