import {
  mutation,
  query,
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { requireUser, requireRole, audit, rateLimit } from "./security";
import { familyContact } from "../src/lib/familyContact";
import { approvalStart, shiftMonth, reverseLines } from "./ledger";
import { FINANCE_ROLES, postJournal } from "./finance";

type Context = MutationCtx | QueryCtx;
// A contact match joins billing, never authorization. Keep householdLinks and
// each person's historical receipts, exports, giving and bank records separate.
// Only an explicit legacy mutual-sharing flow may change account access.
export function normalizedPhone(raw: string) {
  try {
    return raw.trim() ? familyContact("phone", raw) : undefined;
  } catch {
    return undefined;
  }
}
export async function familyMembership(ctx: Context, userId: Id<"users">) {
  const profile = await ctx.db
    .query("members")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const link = await ctx.db
    .query("householdLinks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const household = link ? await ctx.db.get(link.householdId) : null;
  return profile && household ? { profile, household } : null;
}
async function connections(ctx: Context, userId: Id<"users">) {
  const [sent, received] = await Promise.all([
    ctx.db
      .query("familyBillingMatches")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId))
      .collect(),
    ctx.db
      .query("familyBillingMatches")
      .withIndex("by_spouse", (q) => q.eq("spouseUserId", userId))
      .collect(),
  ]);
  return [...new Map([...sent, ...received].map((r) => [r._id, r])).values()];
}
async function tryMatch(ctx: MutationCtx, row: Doc<"familyBillingMatches">) {
  if (row.status !== "waiting_for_match") return;
  let candidates: Id<"users">[] = [];
  if (row.contactKind === "email") {
    candidates = (
      await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", row.contact))
        .collect()
    )
      .filter((u) => !!u.emailVerificationTime)
      .map((u) => u._id);
  } else {
    candidates = (
      await ctx.db
        .query("members")
        .withIndex("by_phone", (q) => q.eq("phoneKey", row.contact))
        .collect()
    ).map((p) => p.userId);
  }
  // Never choose arbitrarily among shared phone numbers or duplicate records.
  if (candidates.length !== 1 || candidates[0] === row.requesterId) return;
  const peerId = candidates[0];
  const [a, b, peer] = await Promise.all([
    familyMembership(ctx, row.requesterId),
    familyMembership(ctx, peerId),
    ctx.db.get(peerId),
  ]);
  if (
    !a ||
    !b ||
    a.profile.status !== "active" ||
    b.profile.status !== "active" ||
    !peer?.emailVerificationTime ||
    a.household.status !== "active" ||
    b.household.status !== "active"
  )
    return;
  if (
    [
      ...(await connections(ctx, row.requesterId)),
      ...(await connections(ctx, peerId)),
    ].some((r) => r._id !== row._id && r.status === "linked")
  )
    return;
  for (const h of [a.household, b.household]) {
    const links = await ctx.db
      .query("householdLinks")
      .withIndex("by_household", (q) => q.eq("householdId", h._id))
      .collect();
    if (
      h.billingHouseholdId ||
      (a.household._id !== b.household._id && links.length !== 1)
    )
      return;
  }
  const primary =
    a.household._creationTime <= b.household._creationTime
      ? a.household
      : b.household;
  const secondary = primary._id === a.household._id ? b.household : a.household;
  const effective = shiftMonth(approvalStart(Date.now()), -1);
  let reconciliationRequired = false;
  if (primary._id !== secondary._id) {
    const [charges, receipts, bankRequests] = await Promise.all([
      ctx.db
        .query("duesCharges")
        .withIndex("by_household_month", (q) =>
          q.eq("householdId", secondary._id),
        )
        .collect(),
      ctx.db
        .query("receipts")
        .withIndex("by_household", (q) => q.eq("householdId", secondary._id))
        .collect(),
      ctx.db
        .query("achRequests")
        .withIndex("by_household", (q) => q.eq("householdId", secondary._id))
        .collect(),
    ]);
    reconciliationRequired =
      receipts.length > 0 || bankRequests.some((r) => r.status !== "withdrawn");
    const closed = await ctx.db
      .query("accountingPeriods")
      .withIndex("by_month", (q) => q.eq("month", effective))
      .unique();
    for (const charge of charges) {
      if (charge.cancelledBy || charge.month < effective) continue;
      const allocations = await ctx.db
        .query("duesAllocations")
        .withIndex("by_charge", (q) => q.eq("chargeId", charge._id))
        .collect();
      if (allocations.some((r) => !r.reversedAt)) {
        reconciliationRequired = true;
        continue;
      }
      const journal = await ctx.db.get(charge.journalId);
      if (!journal || closed) {
        reconciliationRequired = true;
        continue;
      }
      const reversal = await postJournal(
        ctx,
        row.requesterId,
        `${effective}-01`,
        "Duplicate future family dues reversed after automatic spouse match",
        String(secondary._id),
        `auto-family:${row._id}:${charge._id}`,
        reverseLines(journal.lines),
        journal._id,
      );
      await ctx.db.patch(charge._id, { cancelledBy: reversal });
    }
    await ctx.db.patch(secondary._id, {
      billingHouseholdId: primary._id,
      billingEffectiveMonth: effective,
      updatedAt: Date.now(),
    });
  }
  await ctx.db.patch(row._id, {
    spouseUserId: peerId,
    primaryHouseholdId: primary._id,
    secondaryHouseholdId:
      primary._id === secondary._id ? undefined : secondary._id,
    status: "linked",
    reconciliationRequired,
    updatedAt: Date.now(),
  });
  const otherRequests = [
    ...(await connections(ctx, row.requesterId)),
    ...(await connections(ctx, peerId)),
  ];
  for (const request of new Map(
    otherRequests.map((r) => [r._id, r]),
  ).values()) {
    if (request._id !== row._id && request.status === "waiting_for_match")
      await ctx.db.patch(request._id, {
        status: "cancelled",
        updatedAt: Date.now(),
      });
  }
  await audit(
    ctx,
    row.requesterId,
    "family.billing-linked-automatically",
    row._id,
    "One $20 monthly family obligation. Separate account access, giving history, receipts and bank authorizations preserved. No payment initiated.",
  );
}
export async function saveFamilyContact(
  ctx: MutationCtx,
  userId: Id<"users">,
  kind: "email" | "phone",
  raw: string,
) {
  const user = await ctx.db.get(userId),
    me = await familyMembership(ctx, userId);
  if (!me || me.household.status !== "active")
    throw new ConvexError(
      "Complete your family membership registration first.",
    );
  let contact: string;
  try {
    contact = familyContact(kind, raw);
  } catch (e) {
    throw new ConvexError((e as Error).message);
  }
  if (
    (kind === "email" && contact === user?.email?.toLowerCase()) ||
    (kind === "phone" && contact === normalizedPhone(me.profile.phone))
  )
    throw new ConvexError("Enter your spouse’s contact, not your own.");
  const existing = await connections(ctx, userId);
  const linked = existing.find((r) => r.status === "linked");
  if (linked) {
    if (
      linked.requesterId === userId &&
      linked.contactKey === `${kind}:${contact}`
    )
      return;
    const peerId =
      linked.requesterId === userId ? linked.spouseUserId : linked.requesterId;
    const peer = peerId ? await ctx.db.get(peerId) : null;
    const profile = peerId
      ? await ctx.db
          .query("members")
          .withIndex("by_user", (q) => q.eq("userId", peerId))
          .unique()
      : null;
    if (
      (kind === "email" && peer?.email?.toLowerCase() === contact) ||
      (kind === "phone" && normalizedPhone(profile?.phone || "") === contact)
    )
      return;
    throw new ConvexError(
      "Your family is already linked. Contact the office to correct a family connection.",
    );
  }
  const same = existing.find(
    (r) =>
      r.requesterId === userId &&
      r.status === "waiting_for_match" &&
      r.contactKey === `${kind}:${contact}`,
  );
  if (same) {
    await tryMatch(ctx, same);
    return;
  }
  for (const old of existing.filter(
    (r) => r.requesterId === userId && r.status === "waiting_for_match",
  ))
    await ctx.db.patch(old._id, { status: "cancelled", updatedAt: Date.now() });
  const id = await ctx.db.insert("familyBillingMatches", {
    requesterId: userId,
    contactKind: kind,
    contact,
    contactKey: `${kind}:${contact}`,
    status: "waiting_for_match",
    reconciliationRequired: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  await tryMatch(ctx, (await ctx.db.get(id))!);
}
export async function matchArrivingMember(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const user = await ctx.db.get(userId),
    me = await familyMembership(ctx, userId);
  if (!user || !me) return;
  const keys = [
    user.email ? `email:${user.email.toLowerCase()}` : "",
    me.profile.phoneKey ? `phone:${me.profile.phoneKey}` : "",
  ].filter(Boolean);
  for (const key of keys) {
    const rows = await ctx.db
      .query("familyBillingMatches")
      .withIndex("by_contact", (q) =>
        q.eq("contactKey", key).eq("status", "waiting_for_match"),
      )
      .collect();
    // Multiple competing claims are left for correction; never pick a winner.
    if (rows.length === 1) await tryMatch(ctx, rows[0]);
  }
}
export const link = mutation({
  args: {
    kind: v.union(v.literal("email"), v.literal("phone")),
    contact: v.string(),
    consent: v.boolean(),
  },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx);
    if (!a.consent)
      throw new ConvexError(
        "Confirm this is your spouse and that you want one family dues account.",
      );
    await rateLimit(ctx, `auto-family:${user._id}`, 5, 86400000);
    await saveFamilyContact(ctx, user._id, a.kind, a.contact);
  },
});
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return (await connections(ctx, user._id))
      .filter((r) => r.status !== "cancelled")
      .map((r) => ({
        id: r._id,
        status: r.status,
        contactKind: r.requesterId === user._id ? r.contactKind : undefined,
        contact: r.requesterId === user._id ? r.contact : undefined,
        reconciliationRequired: r.reconciliationRequired,
      }));
  },
});
export const officeList = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, FINANCE_ROLES);
    return Promise.all(
      (await ctx.db.query("familyBillingMatches").order("desc").take(300)).map(
        async (r) => ({
          ...r,
          requester: (await ctx.db.get(r.requesterId))?.email,
          spouse: r.spouseUserId
            ? (await ctx.db.get(r.spouseUserId))?.email
            : undefined,
          primaryName: r.primaryHouseholdId
            ? (await ctx.db.get(r.primaryHouseholdId))?.name
            : undefined,
        }),
      ),
    );
  },
});
export const backfillContacts = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => {
    const page = await ctx.db
      .query("members")
      .paginate({ cursor: a.cursor, numItems: 100 });
    for (const p of page.page)
      await ctx.db.patch(p._id, { phoneKey: normalizedPhone(p.phone) });
    return {
      cursor: page.continueCursor,
      done: page.isDone,
      processed: page.page.length,
    };
  },
});
