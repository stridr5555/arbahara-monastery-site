import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Never expose an unsigned/public mutation for provider events.
export const record = internalMutation({
  args: {
    messageSid: v.string(),
    accountSid: v.string(),
    phone: v.string(),
    sender: v.string(),
    kind: v.union(
      v.literal("STOP"),
      v.literal("START"),
      v.literal("HELP"),
      v.literal("ignored"),
    ),
    providerHandled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const previous = await ctx.db
      .query("smsInboundMessages")
      .withIndex("by_message", (q) => q.eq("messageSid", args.messageSid))
      .unique();
    const suppression = await ctx.db
      .query("smsPhoneSuppressions")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();
    if (previous)
      return { duplicate: true, suppressed: suppression?.stopped === true };
    const recordedAt = Date.now();
    // Do not retain free-text message bodies or request headers/secrets.
    await ctx.db.insert("smsInboundMessages", { ...args, recordedAt });
    if (args.kind === "STOP" || args.kind === "START") {
      const state = {
        phone: args.phone,
        sender: args.sender,
        lastMessageSid: args.messageSid,
        updatedAt: recordedAt,
        // START only updates carrier eligibility; explicit website consent is separate.
        stopped: args.kind === "STOP" ? true : (suppression?.stopped ?? false),
        carrierStatus:
          args.kind === "STOP" ? ("blocked" as const) : ("unblocked" as const),
      };
      if (suppression) await ctx.db.patch(suppression._id, state);
      else await ctx.db.insert("smsPhoneSuppressions", state);
    }
    if (args.kind === "STOP") {
      const consents = await ctx.db
        .query("smsConsents")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone))
        .collect();
      for (const consent of consents) {
        if (consent.status === "withdrawn") continue;
        const { _id, _creationTime, status, ...evidence } = consent;
        await ctx.db.insert("smsConsentEvents", {
          ...evidence,
          source: "twilio-inbound",
          event: "withdrawn",
          recordedAt,
          providerMessageSid: args.messageSid,
        });
        await ctx.db.patch(_id, { status: "withdrawn", recordedAt });
      }
    }
    return {
      duplicate: false,
      suppressed: args.kind === "STOP" || suppression?.stopped === true,
    };
  },
});

// For integration at the actual sender boundary. This is not a sending engine.
export const suppressionForPhone = internalQuery({
  args: { phone: v.string() },
  handler: (ctx, args) =>
    ctx.db
      .query("smsPhoneSuppressions")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique(),
});
