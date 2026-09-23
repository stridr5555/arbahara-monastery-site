import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireRole, audit, clean, rateLimit } from "./security";
export const funds = ["construction", "general", "membership"] as const;
export function validateGift(amountCents: number, fund: string) {
  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents < 100 ||
    amountCents > 10000000
  )
    throw new Error("Enter a gift between $1 and $100,000.");
  if (!funds.includes(fund as (typeof funds)[number]))
    throw new Error("Choose a valid fund.");
}
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const u = await requireUser(ctx);
    return (
      await ctx.db
        .query("donations")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .order("desc")
        .take(500)
    ).map(({ reviewedBy, ...d }) => d);
  },
});
export const subscriptions = query({
  args: {},
  handler: async (ctx) => {
    const u = await requireUser(ctx);
    return ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", u._id))
      .collect();
  },
});
export const reportZelle = mutation({
  args: {
    amountCents: v.number(),
    fund: v.string(),
    giftDate: v.string(),
    reference: v.string(),
    requestId: v.string(),
  },
  handler: async (ctx, a) => {
    const u = await requireUser(ctx);
    validateGift(a.amountCents, a.fund);
    const reference = clean(
      a.reference,
      100,
      "Bank confirmation reference",
    ).toUpperCase();
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(a.giftDate) ||
      !Number.isFinite(Date.parse(a.giftDate)) ||
      new Date(a.giftDate).toISOString().slice(0, 10) !== a.giftDate ||
      Date.parse(a.giftDate) > Date.now() + 86400000
    )
      throw new Error("Enter a valid transfer date.");
    if (!/^[\w-]{16,80}$/.test(a.requestId))
      throw new Error("Invalid request.");
    const old = await ctx.db
      .query("donations")
      .withIndex("by_request", (q) =>
        q.eq("userId", u._id).eq("requestId", a.requestId),
      )
      .unique();
    if (old) return old._id;
    const duplicate = await ctx.db
      .query("donations")
      .withIndex("by_reference", (q) => q.eq("reference", reference))
      .first();
    if (duplicate)
      throw new Error(
        "This transfer reference has already been reported. Contact the office if you need a correction.",
      );
    await rateLimit(ctx, `zelle:${u._id}`, 20, 86400000);
    const id = await ctx.db.insert("donations", {
      ...a,
      reference,
      userId: u._id,
      method: "zelle",
      frequency: "once",
      status: "reported",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await audit(ctx, u._id, "zelle.reported", id);
    return id;
  },
});
export const reviewQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "treasurer"]);
    return Promise.all(
      (
        await ctx.db
          .query("donations")
          .withIndex("by_status", (q) => q.eq("status", "reported"))
          .take(300)
      ).map(async (d) => ({
        ...d,
        email: (await ctx.db.get(d.userId))?.email,
      })),
    );
  },
});
export const reconcile = mutation({
  args: { id: v.id("donations"), confirmed: v.boolean(), note: v.string() },
  handler: async (ctx, a) => {
    const u = await requireRole(ctx, ["admin", "treasurer"]);
    const d = await ctx.db.get(a.id);
    if (!d || d.method !== "zelle" || d.status !== "reported")
      throw new Error("Only unreviewed Zelle reports can be reconciled.");
    if (d.userId === u._id)
      throw new Error(
        "Another administrator or treasurer must review your own gift.",
      );
    const note = clean(a.note, 500, "Reconciliation note");
    await ctx.db.patch(d._id, {
      status: a.confirmed ? "confirmed" : "rejected",
      reviewNote: note,
      reviewedBy: u._id,
      updatedAt: Date.now(),
    });
    await audit(
      ctx,
      u._id,
      "zelle.reconciled",
      d._id,
      `${a.confirmed ? "confirmed" : "rejected"}: ${note}`,
    );
  },
});
export const identity = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, a) => {
    const u = await ctx.db.get(a.userId);
    if (!u?.emailVerificationTime)
      throw new Error("Verified sign-in required.");
    return {
      email: u.email,
      customer: (
        await ctx.db
          .query("customers")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .unique()
      )?.stripeCustomerId,
    };
  },
});
export const recordCustomer = internalMutation({
  args: { userId: v.id("users"), stripeCustomerId: v.string() },
  handler: async (ctx, a) => {
    const old = await ctx.db
      .query("customers")
      .withIndex("by_user", (q) => q.eq("userId", a.userId))
      .unique();
    if (old) return old.stripeCustomerId;
    await ctx.db.insert("customers", a);
    return a.stripeCustomerId;
  },
});
export const beginCheckout = internalMutation({
  args: {
    userId: v.id("users"),
    amountCents: v.number(),
    fund: v.string(),
    frequency: v.union(v.literal("once"), v.literal("monthly")),
    requestId: v.string(),
  },
  handler: async (ctx, a) => {
    validateGift(a.amountCents, a.fund);
    if (!/^[\w-]{16,80}$/.test(a.requestId))
      throw new Error("Invalid request.");
    const old = await ctx.db
      .query("donations")
      .withIndex("by_request", (q) =>
        q.eq("userId", a.userId).eq("requestId", a.requestId),
      )
      .unique();
    if (old) {
      if (
        old.amountCents !== a.amountCents ||
        old.fund !== a.fund ||
        old.frequency !== a.frequency
      )
        throw new Error("Please start a new checkout.");
      return old._id;
    }
    await rateLimit(ctx, `checkout:${a.userId}`, 10, 3600000);
    return ctx.db.insert("donations", {
      ...a,
      method: "ach",
      status: "pending",
      giftDate: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
export const attachSession = internalMutation({
  args: { id: v.id("donations"), stripeSessionId: v.string() },
  handler: async (ctx, a) => {
    await ctx.db.patch(a.id, {
      stripeSessionId: a.stripeSessionId,
      updatedAt: Date.now(),
    });
  },
});
