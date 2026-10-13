import { mutation, query, type MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { audit, clean, requireRole } from "./security";
import {
  CHART,
  approvalStart,
  cents,
  coverageMonths,
  reverseLines,
  shiftMonth,
  summarizeJournals,
  validDate,
  validMonth,
  validateJournal,
  type JournalLine,
} from "./ledger";
export const FINANCE_ROLES = ["admin", "treasurer", "secretary"];
const line = v.object({
  account: v.string(),
  fund: v.string(),
  debitCents: v.number(),
  creditCents: v.number(),
});
export async function postJournal(
  ctx: MutationCtx,
  actor: Id<"users">,
  date: string,
  description: string,
  reference: string,
  requestId: string,
  lines: JournalLine[],
  reversalOf?: Id<"journals">,
) {
  validDate(date);
  validateJournal(lines);
  clean(description, 500, "Description");
  clean(reference, 150, "Reference");
  const prior = await ctx.db
    .query("journals")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .unique();
  if (prior) {
    if (
      prior.date !== date ||
      prior.description !== description ||
      prior.reference !== reference ||
      JSON.stringify(prior.lines) !== JSON.stringify(lines)
    )
      throw new ConvexError(
        "This request was already posted with different details.",
      );
    return prior._id;
  }
  if (
    await ctx.db
      .query("accountingPeriods")
      .withIndex("by_month", (q) => q.eq("month", date.slice(0, 7)))
      .unique()
  )
    throw new ConvexError(
      "This accounting period is closed. Use an open-period adjusting entry.",
    );
  const id = await ctx.db.insert("journals", {
    date,
    description,
    reference,
    requestId,
    lines,
    createdBy: actor,
    createdAt: Date.now(),
    ...(reversalOf ? { reversalOf } : {}),
  });
  await audit(ctx, actor, "journal.posted", id, `${date}: ${description}`);
  return id;
}
export async function ensureCharge(
  ctx: MutationCtx,
  actor: Id<"users">,
  householdId: Id<"households">,
  month: string,
) {
  validMonth(month);
  const household = await ctx.db.get(householdId);
  if (
    !household ||
    household.status !== "active" ||
    household.exempt ||
    !household.duesStart ||
    month < household.duesStart
  )
    throw new ConvexError("This household cannot be charged for that month.");
  const prior = await ctx.db
    .query("duesCharges")
    .withIndex("by_household_month", (q) =>
      q.eq("householdId", householdId).eq("month", month),
    )
    .unique();
  if (prior) return prior;
  const journalId = await postJournal(
    ctx,
    actor,
    `${month}-01`,
    `Monthly household dues · ${month}`,
    String(householdId),
    `dues:${householdId}:${month}`,
    [
      { account: "1100", fund: "membership", debitCents: 2000, creditCents: 0 },
      { account: "4000", fund: "membership", debitCents: 0, creditCents: 2000 },
    ],
  );
  const id = await ctx.db.insert("duesCharges", {
    householdId,
    month,
    amountCents: 2000,
    journalId,
    createdAt: Date.now(),
  });
  return (await ctx.db.get(id))!;
}
export const dashboard = query({
  args: { through: v.string() },
  handler: async (ctx, a) => {
    await requireRole(ctx, FINANCE_ROLES);
    validDate(a.through);
    const journals = await ctx.db
      .query("journals")
      .withIndex("by_date", (q) => q.lte("date", a.through))
      .take(5001);
    if (journals.length > 5000)
      throw new ConvexError(
        "This report exceeds the interactive limit. Export and review the ledger with the office.",
      );
    const balances = summarizeJournals(journals, a.through);
    const periods = await ctx.db.query("accountingPeriods").collect();
    const recent = await ctx.db
      .query("journals")
      .withIndex("by_date")
      .order("desc")
      .take(100);
    const receipts = await ctx.db.query("receipts").order("desc").take(100);
    const fundBalances = ["general", "membership", "construction"].map(
      (fund) => ({
        fund,
        bankCents: journals
          .flatMap((j) => j.lines)
          .filter((l) => l.fund === fund && l.account === "1000")
          .reduce((s, l) => s + l.debitCents - l.creditCents, 0),
        incomeCents: journals
          .flatMap((j) => j.lines)
          .filter(
            (l) =>
              l.fund === fund &&
              CHART.some((c) => c.code === l.account && c.kind === "income"),
          )
          .reduce((s, l) => s + l.creditCents - l.debitCents, 0),
      }),
    );
    return {
      balances,
      journals: recent,
      receipts: await Promise.all(
        receipts.map(async (receipt) => ({
          ...receipt,
          unappliedCents: receipt.reversedBy
            ? 0
            : receipt.duesCents -
              (
                await ctx.db
                  .query("duesAllocations")
                  .withIndex("by_receipt", (q) =>
                    q.eq("receiptId", receipt._id),
                  )
                  .collect()
              )
                .filter((a) => !a.reversedAt)
                .reduce((s, a) => s + a.amountCents, 0),
        })),
      ),
      periods,
      fundBalances,
      asOf: a.through,
    };
  },
});
export const post = mutation({
  args: {
    date: v.string(),
    description: v.string(),
    reference: v.string(),
    requestId: v.string(),
    lines: v.array(line),
  },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, FINANCE_ROLES);
    clean(a.requestId, 100, "Request identifier");
    return postJournal(
      ctx,
      actor._id,
      a.date,
      a.description,
      a.reference,
      `manual:${a.requestId}`,
      a.lines,
    );
  },
});
export const closePeriod = mutation({
  args: { month: v.string(), confirm: v.boolean() },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, ["admin", "treasurer"]);
    validMonth(a.month);
    if (!a.confirm)
      throw new ConvexError(
        "Confirm that reconciliation and review are complete.",
      );
    const current = shiftMonth(approvalStart(Date.now()), -1);
    if (a.month >= current)
      throw new ConvexError("Only completed months can be closed.");
    if (
      await ctx.db
        .query("accountingPeriods")
        .withIndex("by_month", (q) => q.eq("month", a.month))
        .unique()
    )
      throw new ConvexError("Period already closed.");
    const id = await ctx.db.insert("accountingPeriods", {
      month: a.month,
      closedBy: actor._id,
      closedAt: Date.now(),
    });
    await audit(ctx, actor._id, "period.closed", id, a.month);
    return id;
  },
});
export const reverse = mutation({
  args: { id: v.id("journals"), date: v.string(), reason: v.string() },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, FINANCE_ROLES),
      old = await ctx.db.get(a.id);
    if (!old) throw new ConvexError("Journal not found.");
    if (old.reversedBy) throw new ConvexError("Already reversed.");
    if (!old.requestId.startsWith("manual:"))
      throw new ConvexError(
        "Reverse this entry through its receipt or membership workflow.",
      );
    if (a.date < old.date)
      throw new ConvexError("A reversal cannot predate its original journal.");
    const id = await postJournal(
      ctx,
      actor._id,
      a.date,
      `Reversal: ${clean(a.reason, 400, "Reason")}`,
      old.reference,
      `reverse:${old._id}`,
      reverseLines(old.lines),
      old._id,
    );
    await ctx.db.patch(old._id, { reversedBy: id });
    await invalidateBankMatch(ctx, actor._id, old._id);
    await audit(ctx, actor._id, "journal.reversed", old._id, a.reason);
    return id;
  },
});
export const recordReceipt = mutation({
  args: {
    householdId: v.optional(v.id("households")),
    date: v.string(),
    duesCents: v.number(),
    giftCents: v.number(),
    giftFund: v.union(v.literal("general"), v.literal("construction")),
    method: v.union(
      v.literal("cash"),
      v.literal("zelle"),
      v.literal("ach"),
      v.literal("check"),
      v.literal("card"),
      v.literal("other"),
    ),
    reference: v.string(),
    requestId: v.string(),
    firstMonth: v.optional(v.string()),
    months: v.number(),
  },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, FINANCE_ROLES);
    validDate(a.date);
    if (
      a.date >
      `${shiftMonth(approvalStart(Date.now()), -1)}-${new Intl.DateTimeFormat("en", { timeZone: "America/Chicago", day: "2-digit" }).format(Date.now())}`
    )
      throw new ConvexError("A received collection cannot be future-dated.");
    cents(a.duesCents, true);
    cents(a.giftCents, true);
    const amount = cents(a.duesCents + a.giftCents);
    coverageMonths(
      a.firstMonth || shiftMonth(approvalStart(Date.now()), -1),
      a.months,
    );
    const intent = JSON.stringify({
      giftFund: a.giftFund,
      firstMonth: a.firstMonth || null,
      months: a.months,
    });
    const reference = clean(
      a.reference,
      150,
      "Bank / receipt reference",
    ).toUpperCase();
    clean(a.requestId, 100, "Request identifier");
    const old = await ctx.db
      .query("receipts")
      .withIndex("by_request", (q) => q.eq("requestId", a.requestId))
      .unique();
    if (old) {
      if (
        old.amountCents !== amount ||
        old.reference !== reference ||
        old.householdId !== a.householdId ||
        old.duesCents !== a.duesCents ||
        old.giftCents !== a.giftCents ||
        old.date !== a.date ||
        old.method !== a.method ||
        (old.intent && old.intent !== intent)
      )
        throw new ConvexError("Request already used for a different receipt.");
      return old._id;
    }
    if (
      await ctx.db
        .query("receipts")
        .withIndex("by_reference", (q) => q.eq("reference", reference))
        .first()
    )
      throw new ConvexError(
        "Reference already recorded. Check for a duplicate collection.",
      );
    const household = a.householdId ? await ctx.db.get(a.householdId) : null;
    if (a.householdId && !household)
      throw new ConvexError("Household not found.");
    if (
      a.duesCents &&
      (!household || household.status !== "active" || household.exempt)
    )
      throw new ConvexError("Dues require an approved, non-exempt household.");
    const cash =
      a.method === "cash" ? "1010" : a.method === "card" ? "1020" : "1000";
    const lines: JournalLine[] = [];
    if (a.duesCents)
      lines.push(
        {
          account: cash,
          fund: "membership",
          debitCents: a.duesCents,
          creditCents: 0,
        },
        {
          account: "2100",
          fund: "membership",
          debitCents: 0,
          creditCents: a.duesCents,
        },
      );
    if (a.giftCents)
      lines.push(
        {
          account: cash,
          fund: a.giftFund,
          debitCents: a.giftCents,
          creditCents: 0,
        },
        {
          account: "4100",
          fund: a.giftFund,
          debitCents: 0,
          creditCents: a.giftCents,
        },
      );
    const journalId = await postJournal(
      ctx,
      actor._id,
      a.date,
      `Collection · ${a.method}`,
      reference,
      `receipt:${a.requestId}`,
      lines,
    );
    const id = await ctx.db.insert("receipts", {
      ...(a.householdId ? { householdId: a.householdId } : {}),
      date: a.date,
      amountCents: amount,
      duesCents: a.duesCents,
      giftCents: a.giftCents,
      method: a.method,
      reference,
      requestId: a.requestId,
      journalId,
      createdBy: actor._id,
      createdAt: Date.now(),
      intent,
    });
    if (a.duesCents && household) {
      const existing = await ctx.db
        .query("duesCharges")
        .withIndex("by_household_month", (q) =>
          q.eq("householdId", household._id),
        )
        .collect();
      let first = a.firstMonth;
      if (!first) {
        for (const charge of existing) {
          const allocations = await ctx.db
            .query("duesAllocations")
            .withIndex("by_charge", (q) => q.eq("chargeId", charge._id))
            .collect();
          if (
            allocations
              .filter((x) => !x.reversedAt)
              .reduce((s, x) => s + x.amountCents, 0) < charge.amountCents
          ) {
            first = charge.month;
            break;
          }
        }
      }
      first = first || household.duesStart!;
      const months = coverageMonths(first, a.months);
      let left = a.duesCents;
      for (const month of months) {
        if (left === 0) break;
        const charge = await ensureCharge(ctx, actor._id, household._id, month);
        const allocated = (
          await ctx.db
            .query("duesAllocations")
            .withIndex("by_charge", (q) => q.eq("chargeId", charge._id))
            .collect()
        )
          .filter((x) => !x.reversedAt)
          .reduce((s, x) => s + x.amountCents, 0);
        const value = Math.min(left, charge.amountCents - allocated);
        if (value <= 0) continue;
        const date = a.date > `${month}-01` ? a.date : `${month}-01`;
        const allocationJournal = await postJournal(
          ctx,
          actor._id,
          date,
          `Allocate collection to dues · ${month}`,
          reference,
          `allocate:${id}:${charge._id}`,
          [
            {
              account: "2100",
              fund: "membership",
              debitCents: value,
              creditCents: 0,
            },
            {
              account: "1100",
              fund: "membership",
              debitCents: 0,
              creditCents: value,
            },
          ],
        );
        await ctx.db.insert("duesAllocations", {
          receiptId: id,
          chargeId: charge._id,
          amountCents: value,
          journalId: allocationJournal,
          createdBy: actor._id,
          createdAt: Date.now(),
        });
        left -= value;
      }
      // Remaining dues collections stay in 2100, never silently become a donation.
    }
    await audit(ctx, actor._id, "receipt.recorded", id, reference);
    return id;
  },
});
export const reverseReceipt = mutation({
  args: { id: v.id("receipts"), date: v.string(), reason: v.string() },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, FINANCE_ROLES),
      receipt = await ctx.db.get(a.id);
    if (!receipt || receipt.reversedBy)
      throw new ConvexError("Receipt missing or already reversed.");
    if (a.date < receipt.date)
      throw new ConvexError("A reversal cannot predate the collection.");
    const reason = clean(a.reason, 400, "Reason"),
      original = (await ctx.db.get(receipt.journalId))!;
    const id = await postJournal(
      ctx,
      actor._id,
      a.date,
      `Reverse collection: ${reason}`,
      receipt.reference,
      `reverse-receipt:${receipt._id}`,
      reverseLines(original.lines),
      original._id,
    );
    await ctx.db.patch(original._id, { reversedBy: id });
    await invalidateBankMatch(ctx, actor._id, original._id);
    await ctx.db.patch(receipt._id, { reversedBy: id });
    for (const allocation of await ctx.db
      .query("duesAllocations")
      .withIndex("by_receipt", (q) => q.eq("receiptId", receipt._id))
      .collect()) {
      if (allocation.reversedAt) continue;
      const entry = (await ctx.db.get(allocation.journalId))!;
      const undo = await postJournal(
        ctx,
        actor._id,
        entry.date > a.date ? entry.date : a.date,
        `Reverse allocation: ${reason}`,
        receipt.reference,
        `reverse-allocation:${allocation._id}`,
        reverseLines(entry.lines),
        entry._id,
      );
      await ctx.db.patch(entry._id, { reversedBy: undo });
      await ctx.db.patch(allocation._id, { reversedAt: Date.now() });
    }
    await audit(ctx, actor._id, "receipt.reversed", receipt._id, reason);
    return id;
  },
});

export const allocateUnapplied = mutation({
  args: { id: v.id("receipts"), firstMonth: v.string(), months: v.number() },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, FINANCE_ROLES),
      receipt = await ctx.db.get(a.id);
    if (!receipt || receipt.reversedBy || !receipt.householdId)
      throw new ConvexError("Choose a current household dues receipt.");
    const all = await ctx.db
      .query("duesAllocations")
      .withIndex("by_receipt", (q) => q.eq("receiptId", receipt._id))
      .collect();
    let left =
      receipt.duesCents -
      all.filter((a) => !a.reversedAt).reduce((s, a) => s + a.amountCents, 0);
    if (left <= 0)
      throw new ConvexError("This receipt has no unapplied dues balance.");
    const current = shiftMonth(approvalStart(Date.now()), -1),
      today = `${current}-${new Intl.DateTimeFormat("en", { timeZone: "America/Chicago", day: "2-digit" }).format(Date.now())}`;
    for (const month of coverageMonths(a.firstMonth, a.months)) {
      if (left === 0) break;
      const charge = await ensureCharge(
          ctx,
          actor._id,
          receipt.householdId,
          month,
        ),
        allocations = await ctx.db
          .query("duesAllocations")
          .withIndex("by_charge", (q) => q.eq("chargeId", charge._id))
          .collect();
      const value = Math.min(
        left,
        charge.amountCents -
          allocations
            .filter((a) => !a.reversedAt)
            .reduce((s, a) => s + a.amountCents, 0),
      );
      if (value <= 0) continue;
      const date = today > `${month}-01` ? today : `${month}-01`;
      const journalId = await postJournal(
        ctx,
        actor._id,
        date,
        `Allocate unapplied collection · ${month}`,
        receipt.reference,
        `allocate-more:${receipt._id}:${charge._id}:${allocations.length}`,
        [
          {
            account: "2100",
            fund: "membership",
            debitCents: value,
            creditCents: 0,
          },
          {
            account: "1100",
            fund: "membership",
            debitCents: 0,
            creditCents: value,
          },
        ],
      );
      await ctx.db.insert("duesAllocations", {
        receiptId: receipt._id,
        chargeId: charge._id,
        amountCents: value,
        journalId,
        createdBy: actor._id,
        createdAt: Date.now(),
      });
      left -= value;
    }
    await audit(
      ctx,
      actor._id,
      "receipt.unapplied-allocated",
      receipt._id,
      `Reviewed coverage from ${a.firstMonth}; $${(left / 100).toFixed(2)} remains unapplied.`,
    );
    return { unappliedCents: left };
  },
});

async function invalidateBankMatch(
  ctx: MutationCtx,
  actor: Id<"users">,
  journalId: Id<"journals">,
) {
  for (const txn of await ctx.db
    .query("bankTransactions")
    .withIndex("by_journal", (q) => q.eq("matchedJournalId", journalId))
    .collect()) {
    await ctx.db.patch(txn._id, {
      matchedJournalId: undefined,
      matchedBy: undefined,
      matchedAt: undefined,
    });
    await audit(
      ctx,
      actor,
      "bank.match-invalidated",
      txn._id,
      "Matched journal was reversed; reconcile the bank activity again.",
    );
  }
}
