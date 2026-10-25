import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { smsPrograms } from "./smsProgram";

// Only this Boolean crosses the service boundary. No membership/profile/payment reads.
export const allowed = internalQuery({
  args: {
    phone: v.string(),
    programId: v.union(v.literal("informational"), v.literal("fundraising")),
    disclosureVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const program = smsPrograms[args.programId];
    if (args.disclosureVersion !== program.version) return false;
    const suppression = await ctx.db
      .query("smsPhoneSuppressions")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();
    if (suppression?.stopped || suppression?.carrierStatus === "blocked")
      return false;
    const all = await ctx.db
      .query("smsConsents")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .take(100);
    if (all.length === 100) return false;
    const records = all.filter((record) => record.programId === args.programId);
    // Shared-phone ambiguity is resolved conservatively: a tied withdrawal wins.
    records.sort(
      (a, b) =>
        b.recordedAt - a.recordedAt ||
        Number(b.status === "withdrawn") - Number(a.status === "withdrawn"),
    );
    const latest = records[0];
    if (!latest || latest.status !== "consented") return false;
    const current = latest.disclosureVersion === program.version && latest.disclosureText === program.disclosure;
    // Support-contact correction only: retain prior explicit consent and exact old evidence.
    const priorContact = latest.disclosureVersion === "2026-10-25-v1" &&
      latest.disclosureText === program.disclosure.replace("469-212-6370", "214-803-1347");
    return current || priorContact;
  },
});
