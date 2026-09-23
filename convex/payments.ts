"use node";
import Stripe from "stripe";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

function client() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error(
      "Bank giving is not available yet. Please use Zelle or contact the office.",
    );
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
export const checkout = action({
  args: {
    amountCents: v.number(),
    fund: v.string(),
    frequency: v.union(v.literal("once"), v.literal("monthly")),
    requestId: v.string(),
  },
  handler: async (ctx, a): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in before continuing.");
    if (
      !process.env.APPROVED_STRIPE_ACCOUNT_ID ||
      !process.env.STRIPE_WEBHOOK_SECRET
    )
      throw new Error(
        "Bank giving is being prepared. You can give through Zelle today.",
      );
    const stripe = client();
    const account = await stripe.accounts.retrieve(
      process.env.APPROVED_STRIPE_ACCOUNT_ID,
    );
    const sandbox =
      process.env.PAYMENTS_TEST_MODE === "true" &&
      process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_");
    if (
      account.id !== process.env.APPROVED_STRIPE_ACCOUNT_ID ||
      (!sandbox &&
        (!account.charges_enabled ||
          !account.payouts_enabled ||
          account.capabilities?.us_bank_account_ach_payments !== "active"))
    )
      throw new Error(
        "Bank giving is temporarily unavailable. Please contact the office.",
      );
    const identity = await ctx.runQuery(internal.donations.identity, {
      userId,
    });
    if (
      a.frequency === "monthly" &&
      (await ctx.runQuery(internal.paymentRecords.hasSubscription, { userId }))
    )
      throw new Error(
        "You already have monthly giving. Use Manage monthly giving to review it.",
      );
    const donationId = await ctx.runMutation(internal.donations.beginCheckout, {
      ...a,
      userId,
    });
    let customer = identity.customer;
    if (!customer) {
      const created = await stripe.customers.create(
        { email: identity.email, metadata: { app: "arbahara", userId } },
        { idempotencyKey: `arbahara-customer-${userId}` },
      );
      customer = await ctx.runMutation(internal.donations.recordCustomer, {
        userId,
        stripeCustomerId: created.id,
      });
    }
    const metadata = { app: "arbahara", userId, donationId, fund: a.fund };
    const site = process.env.SITE_URL || "https://www.haramonastery.org";
    const session = await stripe.checkout.sessions.create(
      {
        mode: a.frequency === "monthly" ? "subscription" : "payment",
        customer,
        payment_method_types: ["us_bank_account"],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: a.amountCents,
              product_data: {
                name: `Arbahara Monastery ${a.fund === "construction" ? "Construction Fund" : a.fund === "membership" ? "Membership Offering" : "General Offering"}`,
              },
              ...(a.frequency === "monthly"
                ? { recurring: { interval: "month" as const } }
                : {}),
            },
          },
        ],
        metadata,
        ...(a.frequency === "monthly"
          ? { subscription_data: { metadata } }
          : { payment_intent_data: { metadata } }),
        success_url: `${site}/members?view=giving&checkout=returned`,
        cancel_url: `${site}/donate?checkout=cancelled`,
        custom_text: {
          submit: {
            message:
              "Thank you for supporting Arbahara Monastery. Your bank payment will appear as pending until it is confirmed.",
          },
        },
      },
      { idempotencyKey: `arbahara-checkout-${donationId}` },
    );
    await ctx.runMutation(internal.donations.attachSession, {
      id: donationId,
      stripeSessionId: session.id,
    });
    if (!session.url) throw new Error("Checkout could not be opened.");
    return session.url;
  },
});
export const billingPortal = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in.");
    const { customer } = await ctx.runQuery(internal.donations.identity, {
      userId,
    });
    if (!customer) throw new Error("No bank giving account is linked yet.");
    const session = await client().billingPortal.sessions.create({
      customer,
      return_url: `${process.env.SITE_URL}/members?view=giving`,
    });
    return session.url;
  },
});

export const acceptWebhook = internalAction({
  args: { body: v.string(), signature: v.string() },
  handler: async (ctx, a): Promise<{ ok: boolean }> => {
    const stripe = client();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        a.body,
        a.signature,
        process.env.STRIPE_WEBHOOK_SECRET || "",
      );
    } catch {
      throw new Error("Invalid webhook signature.");
    }
    const object = event.data.object as unknown as Record<string, any>;
    let payload: Record<string, any> = { type: event.type };
    if (event.type.startsWith("checkout.session.")) {
      if (object.metadata?.app !== "arbahara") return { ok: true };
      payload = {
        ...payload,
        kind: "checkout",
        id: object.metadata.donationId,
        sessionId: object.id,
        paymentIntentId:
          typeof object.payment_intent === "string"
            ? object.payment_intent
            : undefined,
        subscriptionId:
          typeof object.subscription === "string"
            ? object.subscription
            : undefined,
        paid: object.payment_status === "paid",
        mode: object.mode,
      };
    } else if (event.type.startsWith("invoice.")) {
      const subId =
        object.parent?.subscription_details?.subscription ||
        object.subscription;
      if (!subId) return { ok: true };
      const sub = await stripe.subscriptions.retrieve(
        typeof subId === "string" ? subId : subId.id,
      );
      if (sub.metadata.app !== "arbahara") return { ok: true };
      const payments = await stripe.invoicePayments.list({
        invoice: object.id,
        limit: 10,
      });
      const payment = payments.data.find(
        (p) => p.payment.type === "payment_intent",
      )?.payment.payment_intent;
      payload = {
        ...payload,
        kind: "invoice",
        id: sub.metadata.donationId,
        userId: sub.metadata.userId,
        fund: sub.metadata.fund,
        subscriptionId: sub.id,
        invoiceId: object.id,
        paymentIntentId: typeof payment === "string" ? payment : payment?.id,
        amountCents: object.amount_paid || object.amount_due,
        initial: object.billing_reason === "subscription_create",
      };
    } else if (event.type.startsWith("customer.subscription.")) {
      if (object.metadata?.app !== "arbahara") return { ok: true };
      payload = {
        ...payload,
        kind: "subscription",
        userId: object.metadata.userId,
        subscriptionId: object.id,
        status: object.status,
        amountCents: object.items.data[0]?.price.unit_amount || 0,
        fund: object.metadata.fund,
      };
    } else if (
      event.type === "charge.refunded" ||
      event.type.startsWith("charge.dispute.")
    ) {
      const charge =
        event.type === "charge.refunded"
          ? object
          : await stripe.charges.retrieve(
              typeof object.charge === "string"
                ? object.charge
                : object.charge.id,
            );
      const intentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (!intentId) return { ok: true };
      const intent = await stripe.paymentIntents.retrieve(intentId);
      // Subscription intents may not inherit metadata; ownership is checked against our ledger.
      const owned = await ctx.runQuery(internal.paymentRecords.ownsPayment, {
        paymentIntentId: intentId,
      });
      if (!owned && intent.metadata.app !== "arbahara") return { ok: true };
      payload = {
        ...payload,
        kind: "reversal",
        paymentIntentId: intentId,
        refundedCents: charge.amount_refunded || 0,
        disputeStatus: object.status,
      };
    } else return { ok: true };
    await ctx.runMutation(internal.paymentRecords.apply, {
      eventId: event.id,
      eventCreated: event.created,
      payload,
    });
    return { ok: true };
  },
});
