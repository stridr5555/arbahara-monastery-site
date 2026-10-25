import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, rateLimit } from "./security";
import { smsPhone, smsPrograms } from "./smsProgram";

const programId = v.union(v.literal("informational"), v.literal("fundraising"));

export const availability = query({
  args: {},
  handler: () => ({
    collecting: process.env.SMS_CONSENT_COLLECTION_ENABLED === "true",
  }),
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return ctx.db
      .query("smsConsents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const optIn = mutation({
  args: {
    programId,
    phone: v.string(),
    consent: v.boolean(),
    disclosureVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const smsProgram = smsPrograms[args.programId];
    if (process.env.SMS_CONSENT_COLLECTION_ENABLED !== "true")
      throw new ConvexError("Text message enrollment is not open yet.");
    if (!args.consent)
      throw new ConvexError("SMS consent must be an explicit choice.");
    if (args.disclosureVersion !== smsProgram.version)
      throw new ConvexError(
        "The disclosure has changed. Refresh and review it before choosing.",
      );
    let phone: string;
    try {
      phone = smsPhone(args.phone);
    } catch {
      throw new ConvexError("Enter a valid US or Canadian mobile number.");
    }
    const suppression = await ctx.db.query("smsPhoneSuppressions").withIndex("by_phone", q => q.eq("phone", phone)).unique();
    if (suppression?.carrierStatus === "blocked")
      throw new ConvexError("This number is stopped. Reply START or UNSTOP to +1 866-827-6926 to restore carrier eligibility, then return to choose each optional category again.");
    if (suppression?.stopped)
      await ctx.db.patch(suppression._id, { stopped: false, updatedAt: Date.now() });
    await rateLimit(ctx, `sms-consent:${user._id}`, 10, 3600000);
    const current = await ctx.db
      .query("smsConsents")
      .withIndex("by_user_program", (q) =>
        q.eq("userId", user._id).eq("programId", args.programId),
      )
      .unique();
    if (
      current?.status === "consented" &&
      current.phone === phone &&
      current.disclosureVersion === smsProgram.version
    )
      return current._id;
    const now = Date.now();
    if (current?.status === "consented" && current.phone !== phone) {
      await ctx.db.insert("smsConsentEvents", {
        userId: user._id,
        programId: current.programId,
        phone: current.phone,
        event: "withdrawn",
        recordedAt: now,
        source: smsProgram.source,
        disclosureVersion: current.disclosureVersion,
        disclosureText: current.disclosureText,
        privacyUrl: current.privacyUrl,
        termsUrl: current.termsUrl,
      });
    }
    const evidence = {
      userId: user._id,
      programId: smsProgram.id,
      phone,
      recordedAt: now,
      source: smsProgram.source,
      disclosureVersion: smsProgram.version,
      disclosureText: smsProgram.disclosure,
      privacyUrl: smsProgram.privacyUrl,
      termsUrl: smsProgram.termsUrl,
    };
    await ctx.db.insert("smsConsentEvents", {
      ...evidence,
      event: "consented",
    });
    if (current) {
      await ctx.db.patch(current._id, { ...evidence, status: "consented" });
      return current._id;
    }
    return ctx.db.insert("smsConsents", { ...evidence, status: "consented" });
  },
});

export const withdraw = mutation({
  args: { programId },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const current = await ctx.db
      .query("smsConsents")
      .withIndex("by_user_program", (q) =>
        q.eq("userId", user._id).eq("programId", args.programId),
      )
      .unique();
    if (!current || current.status === "withdrawn") return;
    const recordedAt = Date.now();
    const { _id, _creationTime, status, ...evidence } = current;
    await ctx.db.insert("smsConsentEvents", {
      ...evidence,
      event: "withdrawn",
      recordedAt,
    });
    await ctx.db.patch(_id, { status: "withdrawn", recordedAt });
  },
});
