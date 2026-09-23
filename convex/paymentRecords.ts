import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { audit } from "./security";
import type { Id } from "./_generated/dataModel";
export const availability = query({
  args: {},
  handler: () => ({
    ach: !!(
      process.env.STRIPE_SECRET_KEY &&
      process.env.APPROVED_STRIPE_ACCOUNT_ID &&
      process.env.STRIPE_WEBHOOK_SECRET
    ),
    zelleUrl: "https://tinyurl.com/Zelle27",
  }),
});
export const hasSubscription = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, a) =>
    (
      await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", a.userId))
        .collect()
    ).some((s) =>
      ["active", "trialing", "past_due", "incomplete", "unpaid"].includes(
        s.status,
      ),
    ),
});
export const ownsPayment = internalQuery({
  args: { paymentIntentId: v.string() },
  handler: async (ctx, a) =>
    !!(await ctx.db
      .query("donations")
      .withIndex("by_payment", (q) =>
        q.eq("paymentIntentId", a.paymentIntentId),
      )
      .first()),
});
export const apply = internalMutation({
  args: { eventId: v.string(), eventCreated: v.number(), payload: v.any() },
  handler: async (ctx, a) => {
    if (
      await ctx.db
        .query("webhookEvents")
        .withIndex("by_stripe", (q) => q.eq("stripeEventId", a.eventId))
        .unique()
    )
      return;
    const p = a.payload;
    const now = Date.now();
    if (p.kind === "subscription") {
      const old = await ctx.db
        .query("subscriptions")
        .withIndex("by_stripe", (q) =>
          q.eq("stripeSubscriptionId", p.subscriptionId),
        )
        .unique();
      const data = {
        userId: p.userId as Id<"users">,
        stripeSubscriptionId: p.subscriptionId,
        status: p.status,
        amountCents: p.amountCents,
        fund: p.fund,
        updatedAt: a.eventCreated * 1000,
      };
      if (!old) await ctx.db.insert("subscriptions", data);
      else if (old.updatedAt <= data.updatedAt)
        await ctx.db.patch(old._id, data);
    } else if (p.kind === "checkout") {
      const d = await ctx.db.get(p.id as Id<"donations">);
      if (!d) throw new Error("Donation record missing.");
      let status = d.status;
      if (!["confirmed", "refunded", "disputed", "rejected"].includes(status)) {
        if (
          p.type === "checkout.session.async_payment_failed" ||
          p.type === "checkout.session.expired"
        )
          status = "failed";
        else if (
          p.mode === "payment" &&
          (p.type === "checkout.session.async_payment_succeeded" || p.paid)
        )
          status = "confirmed";
      }
      await ctx.db.patch(d._id, {
        status,
        stripeSessionId: p.sessionId,
        ...(p.paymentIntentId ? { paymentIntentId: p.paymentIntentId } : {}),
        ...(p.subscriptionId ? { subscriptionId: p.subscriptionId } : {}),
        updatedAt: now,
      });
    } else if (
      p.kind === "invoice" &&
      ["invoice.paid", "invoice.payment_failed"].includes(p.type)
    ) {
      let d = await ctx.db
        .query("donations")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", p.invoiceId))
        .unique();
      if (!d && p.initial) d = await ctx.db.get(p.id as Id<"donations">);
      const status =
        p.type === "invoice.paid"
          ? ("confirmed" as const)
          : ("failed" as const);
      if (d) {
        const finalStatus = ["refunded", "disputed"].includes(d.status)
          ? d.status
          : d.status === "confirmed" && status === "failed"
            ? "confirmed"
            : status;
        await ctx.db.patch(d._id, {
          status: finalStatus,
          invoiceId: p.invoiceId,
          subscriptionId: p.subscriptionId,
          ...(p.paymentIntentId ? { paymentIntentId: p.paymentIntentId } : {}),
          amountCents: p.amountCents,
          updatedAt: now,
        });
      } else
        await ctx.db.insert("donations", {
          userId: p.userId,
          amountCents: p.amountCents,
          fund: p.fund,
          method: "ach",
          frequency: "monthly",
          status,
          giftDate: new Date(a.eventCreated * 1000).toISOString().slice(0, 10),
          createdAt: now,
          updatedAt: now,
          invoiceId: p.invoiceId,
          subscriptionId: p.subscriptionId,
          ...(p.paymentIntentId ? { paymentIntentId: p.paymentIntentId } : {}),
          requestId: p.invoiceId,
        });
    } else if (p.kind === "reversal") {
      const d = await ctx.db
        .query("donations")
        .withIndex("by_payment", (q) =>
          q.eq("paymentIntentId", p.paymentIntentId),
        )
        .first();
      if (!d) throw new Error("Payment record is not ready for reversal.");
      await ctx.db.patch(d._id, {
        status:
          p.type === "charge.refunded"
            ? p.refundedCents >= d.amountCents
              ? "refunded"
              : d.status
            : p.type === "charge.dispute.closed" && p.disputeStatus === "won"
              ? d.refundedCents && d.refundedCents >= d.amountCents
                ? "refunded"
                : "confirmed"
              : "disputed",
        refundedCents: Math.max(d.refundedCents || 0, p.refundedCents || 0),
        updatedAt: now,
      });
    }
    await ctx.db.insert("webhookEvents", {
      stripeEventId: a.eventId,
      type: p.type,
      createdAt: now,
    });
    await audit(ctx, undefined, `stripe.${p.type}`, a.eventId);
  },
});
