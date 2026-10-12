import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { audit, clean, requireUser, requireRole } from "./security";
import {
  approvalStart,
  coverageMonths,
  validMonth,
  shiftMonth,
} from "./ledger";
import { ensureCharge, FINANCE_ROLES } from "./finance";
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx),
      link = await ctx.db
        .query("householdLinks")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
    if (!link) return null;
    const household = await ctx.db.get(link.householdId);
    if (!household) return null;
    const charges = await ctx.db
      .query("duesCharges")
      .withIndex("by_household_month", (q) =>
        q.eq("householdId", household._id),
      )
      .collect();
    const dues = await Promise.all(
      charges.map(async (c) => ({
        ...c,
        paidCents: (
          await ctx.db
            .query("duesAllocations")
            .withIndex("by_charge", (q) => q.eq("chargeId", c._id))
            .collect()
        )
          .filter((x) => !x.reversedAt)
          .reduce((s, x) => s + x.amountCents, 0),
      })),
    );
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_household", (q) => q.eq("householdId", household._id))
      .collect();
    return {
      household,
      dues,
      receipts: receipts.map(({ createdBy, requestId, ...r }) => r),
    };
  },
});
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, FINANCE_ROLES);
    const rows = await ctx.db.query("households").take(1001);
    if (rows.length > 1000)
      throw new Error(
        "Use a paginated roster export for more than 1000 households.",
      );
    return rows;
  },
});
export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    address: v.string(),
    exempt: v.boolean(),
  },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, FINANCE_ROLES);
    const name = clean(a.name, 120, "Household name");
    if (a.phone.length > 40 || a.address.length > 500)
      throw new Error("Please shorten contact fields.");
    if (a.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email))
      throw new Error("Enter a valid email.");
    const id = await ctx.db.insert("households", {
      ...a,
      name,
      email: a.email?.trim().toLowerCase(),
      source: "office",
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await audit(ctx, actor._id, "household.created", id);
    return id;
  },
});
export const approve = mutation({
  args: { id: v.id("households") },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, ["admin", "secretary"]),
      old = await ctx.db.get(a.id);
    if (!old) throw new Error("Household not found.");
    if (old.approvedAt)
      throw new Error(
        "Household already approved. Use status review, not a second approval.",
      );
    const duesStart = approvalStart(Date.now());
    await ctx.db.patch(a.id, {
      status: "active",
      approvedAt: Date.now(),
      approvedBy: actor._id,
      duesStart,
      updatedAt: Date.now(),
    });
    if (!old.exempt)
      for (const month of coverageMonths(duesStart, 12))
        await ensureCharge(ctx, actor._id, a.id, month);
    for (const link of await ctx.db
      .query("householdLinks")
      .withIndex("by_household", (q) => q.eq("householdId", a.id))
      .collect()) {
      const member = await ctx.db
        .query("members")
        .withIndex("by_user", (q) => q.eq("userId", link.userId))
        .unique();
      if (member)
        await ctx.db.patch(member._id, {
          status: "active",
          updatedAt: Date.now(),
        });
    }
    await audit(
      ctx,
      actor._id,
      "household.approved",
      a.id,
      `${old.exempt ? "Exempt" : "$20 monthly"}; starts ${duesStart}`,
    );
  },
});
export const linkAccount = mutation({
  args: {
    id: v.id("households"),
    email: v.string(),
    reviewPendingApplication: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, ["admin", "secretary"]);
    const destination = await ctx.db.get(a.id);
    if (!destination || destination.status === "inactive")
      throw new Error("Choose a current household.");
    const user = (
      await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", a.email.trim().toLowerCase()))
        .collect()
    ).find((u) => u.emailVerificationTime);
    if (!user)
      throw new Error("This person must first sign in and verify their email.");
    const prior = await ctx.db
      .query("householdLinks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (prior?.householdId === a.id) return;
    if (prior) {
      const source = await ctx.db.get(prior.householdId),
        links = await ctx.db
          .query("householdLinks")
          .withIndex("by_household", (q) =>
            q.eq("householdId", prior.householdId),
          )
          .collect();
      const charges = await ctx.db
          .query("duesCharges")
          .withIndex("by_household_month", (q) =>
            q.eq("householdId", prior.householdId),
          )
          .first(),
        receipt = await ctx.db
          .query("receipts")
          .withIndex("by_household", (q) =>
            q.eq("householdId", prior.householdId),
          )
          .first();
      if (
        !a.reviewPendingApplication ||
        source?.source !== "application" ||
        source.status !== "pending" ||
        source.approvedAt ||
        charges ||
        receipt ||
        links.length !== 1
      )
        throw new Error(
          "Account already linked. Only an explicitly reviewed, unapproved application with no financial history can be consolidated here. Other merges require accountant review.",
        );
      await ctx.db.patch(source._id, {
        status: "inactive",
        updatedAt: Date.now(),
      });
      await ctx.db.patch(prior._id, { householdId: a.id, linkedBy: actor._id });
      await audit(
        ctx,
        actor._id,
        "household.application-consolidated",
        source._id,
        `Verified account ${user._id} linked to reviewed household ${a.id}; no financial records moved.`,
      );
    } else
      await ctx.db.insert("householdLinks", {
        householdId: a.id,
        userId: user._id,
        linkedBy: actor._id,
        createdAt: Date.now(),
      });
    const profile = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (profile && destination.status === "active")
      await ctx.db.patch(profile._id, {
        status: "active",
        updatedAt: Date.now(),
      });
    await audit(ctx, actor._id, "household.account-linked", a.id, user._id);
  },
});
export const assess = mutation({
  args: { id: v.id("households"), month: v.string() },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, FINANCE_ROLES);
    validMonth(a.month);
    return (await ensureCharge(ctx, actor._id, a.id, a.month))._id;
  },
});
export const extendDues = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => {
    const page = await ctx.db
      .query("households")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .paginate({ cursor: a.cursor, numItems: 10 });
    const current = shiftMonth(approvalStart(Date.now()), -1);
    for (const household of page.page) {
      if (household.exempt || !household.duesStart) continue;
      const old = await ctx.db
        .query("duesCharges")
        .withIndex("by_household_month", (q) =>
          q.eq("householdId", household._id),
        )
        .first();
      const actor =
        household.approvedBy ||
        (old ? (await ctx.db.get(old.journalId))?.createdBy : undefined);
      if (!actor) continue;
      for (const month of coverageMonths(
        current > household.duesStart ? current : household.duesStart,
        12,
      ))
        await ensureCharge(ctx, actor, household._id, month);
    }
    if (!page.isDone)
      await ctx.scheduler.runAfter(1000, internal.households.extendDues, {
        cursor: page.continueCursor,
      });
  },
});
export const inviteStaff = mutation({
  args: {
    email: v.string(),
    role: v.union(
      v.literal("secretary"),
      v.literal("treasurer"),
      v.literal("checkin"),
    ),
  },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, ["admin"]);
    const email = clean(a.email.toLowerCase(), 200, "Email");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      throw new Error("Enter a valid email.");
    const old = await ctx.db
      .query("staffInvitations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    const values = {
      email,
      role: a.role,
      invitedBy: actor._id,
      createdAt: Date.now(),
      revokedAt: undefined,
    };
    const id = old ? old._id : await ctx.db.insert("staffInvitations", values);
    if (old) await ctx.db.patch(old._id, values);
    await audit(ctx, actor._id, "staff.invited", id, a.role);
    return id;
  },
});
export const staffInvites = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    return ctx.db.query("staffInvitations").collect();
  },
});
export const revokeInvitation = mutation({
  args: { id: v.id("staffInvitations") },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, ["admin"]);
    if (!(await ctx.db.get(a.id))) throw new Error("Invitation not found.");
    await ctx.db.patch(a.id, { revokedAt: Date.now() });
    await audit(ctx, actor._id, "staff.invitation-revoked", a.id);
  },
});
