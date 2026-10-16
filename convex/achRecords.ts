import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  requireUser,
  requireRole,
  roleFor,
  rateLimit,
  audit,
  clean,
} from "./security";
import { FINANCE_ROLES } from "./finance";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
async function familyBankRequests(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">,
) {
  const h = await ctx.db.get(householdId);
  if (!h) return [];
  const primary = h.billingHouseholdId || h._id;
  const secondary = await ctx.db
    .query("households")
    .withIndex("by_billing_household", (q) =>
      q.eq("billingHouseholdId", primary),
    )
    .collect();
  return (
    await Promise.all(
      [primary, ...secondary.map((s) => s._id)].map((id) =>
        ctx.db
          .query("achRequests")
          .withIndex("by_household", (q) => q.eq("householdId", id))
          .collect(),
      ),
    )
  ).flat();
}
import {
  BANK_SHARING_TEXT,
  BANK_SHARING_VERSION,
  canTransitionAch,
} from "./achValidation";
const state = v.union(
  v.literal("submitted"),
  v.literal("needs_information"),
  v.literal("ready_for_chase"),
  v.literal("entered_in_chase"),
  v.literal("withdrawn"),
);
export const identity = internalQuery({
  args: {
    userId: v.id("users"),
    finance: v.optional(v.boolean()),
    reveal: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    const user = await ctx.db.get(a.userId);
    if (!user?.emailVerificationTime)
      throw new ConvexError("Verified sign-in required.");
    const role = await roleFor(ctx, a.userId);
    if (
      a.finance &&
      !(a.reveal ? ["admin", "treasurer"] : FINANCE_ROLES).includes(role)
    )
      throw new ConvexError("Finance permission required.");
    const links = await ctx.db
      .query("householdLinks")
      .withIndex("by_user", (q) => q.eq("userId", a.userId))
      .collect();
    if (a.finance) return { role, householdId: undefined };
    if (links.length !== 1)
      throw new ConvexError(
        "Ask the office to link your household before submitting bank details.",
      );
    const h = await ctx.db.get(links[0].householdId);
    if (!h || h.status !== "active" || h.exempt)
      throw new ConvexError(
        "An active, non-exempt household membership is required.",
      );
    return {
      role,
      householdId: h._id,
      familyHasSetup: (await familyBankRequests(ctx, h._id)).some(
        (r) => r.status !== "withdrawn",
      ),
    };
  },
});
export const challenge = internalMutation({
  args: {
    userId: v.id("users"),
    householdId: v.id("households"),
    keyId: v.string(),
  },
  handler: async (ctx, a) => {
    await rateLimit(ctx, `ach-prepare:${a.userId}`, 8, 3600000);
    return ctx.db.insert("achChallenges", {
      ...a,
      expiresAt: Date.now() + 15 * 60000,
    });
  },
});
export const getChallenge = internalQuery({
  args: { id: v.id("achChallenges") },
  handler: (ctx, a) => ctx.db.get(a.id),
});
export const save = internalMutation({
  args: {
    challengeId: v.id("achChallenges"),
    userId: v.id("users"),
    fingerprint: v.string(),
    encryptedDetails: v.string(),
    lastFour: v.string(),
    accountHolder: v.string(),
    bankName: v.string(),
    accountType: v.union(v.literal("checking"), v.literal("savings")),
    ownership: v.union(v.literal("personal"), v.literal("business")),
    frequency: v.union(v.literal("monthly"), v.literal("annual")),
  },
  handler: async (ctx, a) => {
    const c = await ctx.db.get(a.challengeId);
    if (!c || c.userId !== a.userId || c.expiresAt < Date.now())
      throw new ConvexError("This request expired. Please start again.");
    if (c.consumedBy) {
      if (c.fingerprint !== a.fingerprint)
        throw new ConvexError(
          "This request was already used. Please start again.",
        );
      return c.consumedBy;
    }
    const link = await ctx.db
      .query("householdLinks")
      .withIndex("by_user", (q) => q.eq("userId", a.userId))
      .unique();
    const household = await ctx.db.get(c.householdId);
    if (
      link?.householdId !== c.householdId ||
      household?.status !== "active" ||
      household.exempt
    )
      throw new ConvexError(
        "Household membership changed. Ask the office to review it.",
      );
    const current = await familyBankRequests(ctx, c.householdId);
    if (current.some((r) => r.status !== "withdrawn"))
      throw new ConvexError(
        "Your household already has a bank setup request. Withdraw it before replacing the account.",
      );
    const { challengeId, fingerprint, ...values } = a;
    const now = Date.now();
    const id = await ctx.db.insert("achRequests", {
      ...values,
      householdId: c.householdId,
      amountCents: a.frequency === "monthly" ? 2000 : 24000,
      consentText: BANK_SHARING_TEXT,
      consentVersion: BANK_SHARING_VERSION,
      status: "submitted",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(challengeId, { consumedBy: id, fingerprint });
    await audit(
      ctx,
      a.userId,
      "ach.request-submitted",
      id,
      "Encrypted bank setup request only; no debit mandate or payment.",
    );
    return id;
  },
});
function masked<T extends { encryptedDetails?: string }>(r: T) {
  const { encryptedDetails, ...safe } = r;
  return safe;
}
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const records = await ctx.db
      .query("achRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
    return records.map(masked);
  },
});
export const queue = query({
  args: { status: v.optional(state) },
  handler: async (ctx, a) => {
    await requireRole(ctx, FINANCE_ROLES);
    const rows = a.status
      ? await ctx.db
          .query("achRequests")
          .withIndex("by_status", (q) => q.eq("status", a.status!))
          .order("desc")
          .take(101)
      : await ctx.db.query("achRequests").order("desc").take(101);
    return {
      truncated: rows.length > 100,
      rows: await Promise.all(
        rows.slice(0, 100).map(async (r) => {
          const own = await ctx.db.get(r.householdId);
          const primary = own?.billingHouseholdId
            ? await ctx.db.get(own.billingHouseholdId)
            : null;
          return {
            ...masked(r),
            householdName: own?.name || "Household unavailable",
            billingFamilyName: primary?.name,
          };
        }),
      ),
    };
  },
});
export const review = mutation({
  args: {
    id: v.id("achRequests"),
    status: state,
    memberMessage: v.string(),
    authorizationReference: v.optional(v.string()),
    chasePayorReference: v.optional(v.string()),
    verifiedAuthorization: v.boolean(),
  },
  handler: async (ctx, a) => {
    const user = await requireRole(ctx, FINANCE_ROLES),
      r = await ctx.db.get(a.id);
    if (!r || !canTransitionAch(r.status, a.status))
      throw new ConvexError(
        "This request changed or the status change is not allowed. Refresh and review it again.",
      );
    if (r.userId === user._id && a.status !== "withdrawn")
      throw new ConvexError(
        "Another finance reviewer must review your own bank request.",
      );
    const note = clean(a.memberMessage, 400, "Message to member");
    if (/\d{9,}/.test(note))
      throw new ConvexError("Do not put bank numbers in notes.");
    let authorizationReference = r.authorizationReference;
    if (a.status === "ready_for_chase") {
      if (!a.verifiedAuthorization)
        throw new ConvexError(
          "Obtain and review the bank-approved debit authorization first.",
        );
      authorizationReference = clean(
        a.authorizationReference || "",
        100,
        "Authorization record reference",
      );
      if (/\d{9,}/.test(authorizationReference))
        throw new ConvexError("Use a document reference, not bank numbers.");
    }
    let chasePayorReference = r.chasePayorReference;
    if (a.status === "entered_in_chase") {
      await requireRole(ctx, ["admin", "treasurer"]);
      if (!authorizationReference)
        throw new ConvexError("Authorization record is missing.");
      chasePayorReference = clean(
        a.chasePayorReference || "",
        100,
        "Chase payor reference",
      );
      if (/\d{9,}/.test(chasePayorReference))
        throw new ConvexError(
          "Use a payor nickname or reference, not bank numbers.",
        );
    }
    await ctx.db.patch(r._id, {
      status: a.status,
      memberMessage: note,
      authorizationReference,
      chasePayorReference,
      ...(a.status === "withdrawn" ? { encryptedDetails: undefined } : {}),
      updatedAt: Date.now(),
      reviewedBy: user._id,
    });
    await audit(
      ctx,
      user._id,
      `ach.${a.status}`,
      r._id,
      "Manual setup status changed. No collection or ledger entry created.",
    );
  },
});
export const withdraw = mutation({
  args: { id: v.id("achRequests") },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx),
      r = await ctx.db.get(a.id);
    if (!r || r.userId !== user._id)
      throw new ConvexError("Request not found.");
    if (r.status === "withdrawn") return;
    await ctx.db.patch(r._id, {
      status: "withdrawn",
      encryptedDetails: undefined,
      updatedAt: Date.now(),
    });
    await audit(
      ctx,
      user._id,
      "ach.withdrawn",
      r._id,
      "Bank details removed from active storage. Office must separately cancel any existing Chase instruction; request was not a bank cancellation.",
    );
  },
});
export const revealGrant = internalMutation({
  args: { id: v.id("achRequests"), userId: v.id("users") },
  handler: async (ctx, a) => {
    const role = await roleFor(ctx, a.userId),
      user = await ctx.db.get(a.userId),
      r = await ctx.db.get(a.id);
    if (!user?.emailVerificationTime || !["admin", "treasurer"].includes(role))
      throw new ConvexError("Bank-detail permission required.");
    if (
      !r?.encryptedDetails ||
      r.status !== "ready_for_chase" ||
      r.userId === a.userId
    )
      throw new ConvexError(
        "Only another reviewer's authorized request ready for Chase can be revealed.",
      );
    await rateLimit(ctx, `ach-reveal:${a.userId}`, 20, 3600000);
    await audit(
      ctx,
      a.userId,
      "ach.bank-details-viewed",
      r._id,
      "Temporary view for manual Chase payor entry; no export or payment.",
    );
    return {
      encryptedDetails: r.encryptedDetails,
      userId: r.userId,
      householdId: r.householdId,
      updatedAt: r.updatedAt,
    };
  },
});
export const stillRevealable = internalQuery({
  args: { id: v.id("achRequests"), updatedAt: v.number() },
  handler: async (ctx, a) => {
    const r = await ctx.db.get(a.id);
    return (
      r?.status === "ready_for_chase" &&
      r.updatedAt === a.updatedAt &&
      !!r.encryptedDetails
    );
  },
});
export const cleanupChallenges = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("achChallenges")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", Date.now() - 86400000))
      .take(200);
    for (const row of rows) await ctx.db.delete(row._id);
  },
});
