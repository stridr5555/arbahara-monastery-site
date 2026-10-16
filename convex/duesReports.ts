import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { audit, clean, rateLimit, requireRole, requireUser } from "./security";
import { FINANCE_ROLES } from "./finance";

export const declaration = v.object({
  answer: v.union(v.literal("yes"), v.literal("no"), v.literal("unsure")),
  method: v.optional(
    v.union(v.literal("zelle"), v.literal("check"), v.literal("cash")),
  ),
  amountCents: v.optional(v.number()),
  date: v.optional(v.string()),
  coverage: v.optional(v.string()),
  reference: v.optional(v.string()),
});
type Declaration = {
  answer: "yes" | "no" | "unsure";
  method?: "zelle" | "check" | "cash";
  amountCents?: number;
  date?: string;
  coverage?: string;
  reference?: string;
};

// A declaration is not a receipt, allocation, or permission to collect money.
export async function saveDeclaration(
  ctx: MutationCtx,
  userId: Id<"users">,
  input: Declaration,
) {
  const link = await ctx.db
    .query("householdLinks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (!link)
    throw new ConvexError("Complete your membership registration first.");
  if (input.answer === "yes" && !input.method)
    throw new ConvexError(
      "Choose Zelle, check, or cash for your reported dues payment.",
    );
  if (
    input.amountCents !== undefined &&
    (!Number.isSafeInteger(input.amountCents) ||
      input.amountCents <= 0 ||
      input.amountCents > 100000000)
  )
    throw new ConvexError(
      "Enter a positive payment amount with at most two decimal places.",
    );
  if (
    input.date &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
      !Number.isFinite(Date.parse(input.date)) ||
      new Date(input.date).toISOString().slice(0, 10) !== input.date ||
      input.date >
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Chicago",
        }).format(new Date()))
  )
    throw new ConvexError(
      "Enter a valid payment date that is not in the future.",
    );
  if (
    (input.coverage?.length || 0) > 240 ||
    (input.reference?.length || 0) > 240
  )
    throw new ConvexError(
      "Keep payment coverage and reference details under 240 characters each.",
    );
  const values = {
    answer: input.answer,
    method: input.answer === "yes" ? input.method : undefined,
    amountCents: input.answer === "yes" ? input.amountCents : undefined,
    date: input.answer === "yes" ? input.date || undefined : undefined,
    coverage:
      input.answer !== "no" ? input.coverage?.trim() || undefined : undefined,
    reference:
      input.answer !== "no" ? input.reference?.trim() || undefined : undefined,
  };
  const old = await ctx.db
    .query("duesDeclarations")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  // Idempotent retries must not reopen reviewed work or make duplicate reports.
  if (
    old &&
    old.householdId === link.householdId &&
    Object.entries(values).every(
      ([key, value]) => old[key as keyof typeof values] === value,
    )
  )
    return old._id;
  await rateLimit(ctx, `dues-declaration:${userId}`, 20, 86400000);
  const updates = {
    ...values,
    status:
      input.answer === "no" ? ("not_needed" as const) : ("pending" as const),
    updatedAt: Math.max(Date.now(), (old?.updatedAt || 0) + 1),
    reviewedAt: undefined,
    reviewedBy: undefined,
    reviewNote: undefined,
  };
  const id = old
    ? old._id
    : await ctx.db.insert("duesDeclarations", {
        ...updates,
        userId,
        householdId: link.householdId,
      });
  if (old)
    await ctx.db.patch(id, { ...updates, householdId: link.householdId });
  await audit(
    ctx,
    userId,
    "dues.declared",
    id,
    `Self-report: ${input.answer}; no receipt or bank collection created.`,
  );
  return id;
}
export const save = mutation({
  args: { declaration },
  handler: async (ctx, args) =>
    saveDeclaration(ctx, (await requireUser(ctx))._id, args.declaration),
});
export function memberVisibleDeclaration(
  report: Doc<"duesDeclarations"> | null,
) {
  if (!report) return null;
  const { reviewedBy, reviewNote, ...own } = report;
  return own;
}
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const report = await ctx.db
      .query("duesDeclarations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    return memberVisibleDeclaration(report);
  },
});
export const pending = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, FINANCE_ROLES);
    const reports = await ctx.db
      .query("duesDeclarations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(101);
    return Promise.all(
      reports.map(async (report) => {
        const [household, user] = await Promise.all([
          ctx.db.get(report.householdId),
          ctx.db.get(report.userId),
        ]);
        const billing = household?.billingHouseholdId
          ? await ctx.db.get(household.billingHouseholdId)
          : household;
        return {
          ...report,
          email: user?.email,
          householdName: household?.name,
          billingName: billing?.name,
        };
      }),
    );
  },
});
export const review = mutation({
  args: {
    id: v.id("duesDeclarations"),
    expectedUpdatedAt: v.number(),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, FINANCE_ROLES);
    const report = await ctx.db.get(args.id);
    if (
      !report ||
      report.status !== "pending" ||
      report.updatedAt !== args.expectedUpdatedAt
    )
      throw new ConvexError(
        "This report changed. Reload and review the latest details.",
      );
    const note = clean(args.note, 500, "Reconciliation note");
    await ctx.db.patch(report._id, {
      status: "reviewed",
      reviewedAt: Date.now(),
      reviewedBy: actor._id,
      reviewNote: note,
    });
    await audit(ctx, actor._id, "dues.declaration-reviewed", report._id, note);
    // Bookkeeping stays in finance.recordReceipt; never create money from a claim.
  },
});
