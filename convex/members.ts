import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUser, requireRole, roleFor, audit, clean } from "./security";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const id = await getAuthUserId(ctx);
    if (!id) return null;
    const user = await requireUser(ctx);
    return {
      email: user.email,
      role: await roleFor(ctx, id),
      profile: await ctx.db
        .query("members")
        .withIndex("by_user", (q) => q.eq("userId", id))
        .unique(),
    };
  },
});
export const save = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    city: v.string(),
    language: v.union(v.literal("en"), v.literal("am")),
    interests: v.array(v.string()),
    consent: v.boolean(),
    baptismalName: v.optional(v.string()),
    spouseName: v.optional(v.string()),
    spouseBaptismalName: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx);
    if (!a.consent) throw new Error("Please accept the privacy notice.");
    const name = clean(a.name, 120, "Name");
    if (
      [a.baptismalName, a.spouseName, a.spouseBaptismalName].some(
        (x) => x && x.length > 120,
      ) ||
      (a.address?.length || 0) > 500
    )
      throw new Error("Please shorten household fields.");
    if (a.phone.length > 40 || a.city.length > 120 || a.interests.length > 10)
      throw new Error("Please shorten the profile fields.");
    const allowed = [
      "Prayer and worship",
      "Volunteering",
      "Youth and education",
      "Construction support",
      "Archive preservation",
    ];
    if (a.interests.some((i) => !allowed.includes(i)))
      throw new Error("Invalid interest.");
    const old = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const values = {
      name,
      phone: a.phone.trim(),
      city: a.city.trim(),
      language: a.language,
      interests: a.interests,
      updatedAt: Date.now(),
      ...(a.baptismalName !== undefined
        ? { baptismalName: a.baptismalName.trim() }
        : {}),
      ...(a.spouseName !== undefined
        ? { spouseName: a.spouseName.trim() }
        : {}),
      ...(a.spouseBaptismalName !== undefined
        ? { spouseBaptismalName: a.spouseBaptismalName.trim() }
        : {}),
      ...(a.address !== undefined ? { address: a.address.trim() } : {}),
    };
    const id = old
      ? old._id
      : await ctx.db.insert("members", {
          ...values,
          userId: user._id,
          status: "pending",
          consentAt: Date.now(),
          memberNumber: `ARB-${user._id.slice(-8).toUpperCase()}`,
        });
    if (old) await ctx.db.patch(id, values);
    const link = await ctx.db
      .query("householdLinks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!link) {
      const householdId = await ctx.db.insert("households", {
        name,
        email: user.email,
        phone: a.phone.trim(),
        address: a.address?.trim() || a.city.trim(),
        status: "pending",
        exempt: false,
        source: "application",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("householdLinks", {
        householdId,
        userId: user._id,
        linkedBy: user._id,
        createdAt: Date.now(),
      });
    } else {
      const household = await ctx.db.get(link.householdId);
      if (
        household?.source === "application" &&
        household.status === "pending" &&
        !household.approvedAt &&
        (
          await ctx.db
            .query("householdLinks")
            .withIndex("by_household", (q) =>
              q.eq("householdId", household._id),
            )
            .collect()
        ).length === 1
      )
        await ctx.db.patch(household._id, {
          name,
          email: user.email,
          phone: a.phone.trim(),
          address: a.address?.trim() || a.city.trim(),
          updatedAt: Date.now(),
        });
    }
    await audit(ctx, user._id, old ? "member.updated" : "member.applied", id);
    return id;
  },
});
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    return Promise.all(
      (await ctx.db.query("members").order("desc").take(500)).map(
        async (m) => ({ ...m, email: (await ctx.db.get(m.userId))?.email }),
      ),
    );
  },
});
export const setStatus = mutation({
  args: {
    id: v.id("members"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("inactive"),
    ),
  },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, ["admin"]);
    const old = await ctx.db.get(a.id);
    if (!old) throw new Error("Member not found.");
    await ctx.db.patch(a.id, { status: a.status, updatedAt: Date.now() });
    await audit(
      ctx,
      actor._id,
      "member.status",
      a.id,
      `${old.status} -> ${a.status}`,
    );
  },
});
export const grantRole = mutation({
  args: {
    email: v.string(),
    role: v.union(
      v.literal("member"),
      v.literal("admin"),
      v.literal("treasurer"),
      v.literal("checkin"),
    ),
  },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, ["admin"]);
    const email = a.email.trim().toLowerCase();
    const users = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .collect();
    const user = users.find((u) => u.emailVerificationTime);
    if (!user)
      throw new Error("That person must sign in and verify their email first.");
    const role = await ctx.db
      .query("roles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (a.role === "member") {
      if (role) await ctx.db.delete(role._id);
    } else if (role)
      await ctx.db.patch(role._id, { role: a.role, grantedBy: actor._id });
    else
      await ctx.db.insert("roles", {
        userId: user._id,
        role: a.role,
        grantedBy: actor._id,
      });
    await audit(ctx, actor._id, "role.changed", user._id, a.role);
  },
});
export const exportMine = query({
  args: {},
  handler: async (ctx) => {
    const u = await requireUser(ctx);
    const link = await ctx.db
      .query("householdLinks")
      .withIndex("by_user", (q) => q.eq("userId", u._id))
      .unique();
    const household = link ? await ctx.db.get(link.householdId) : null;
    const charges = household
      ? await ctx.db
          .query("duesCharges")
          .withIndex("by_household_month", (q) =>
            q.eq("householdId", household._id),
          )
          .collect()
      : [];
    const receipts = household
      ? await ctx.db
          .query("receipts")
          .withIndex("by_household", (q) => q.eq("householdId", household._id))
          .collect()
      : [];
    return {
      schemaVersion: 3,
      exportedAt: new Date().toISOString(),
      email: u.email,
      formerHouseholdRecords: await Promise.all(
        (
          await ctx.db
            .query("formerHouseholdLinks")
            .withIndex("by_user", (q) => q.eq("userId", u._id))
            .collect()
        ).map(async (link) => ({
          household: await ctx.db.get(link.householdId),
          charges: await ctx.db
            .query("duesCharges")
            .withIndex("by_household_month", (q) =>
              q.eq("householdId", link.householdId),
            )
            .collect(),
          receipts: (
            await ctx.db
              .query("receipts")
              .withIndex("by_household", (q) =>
                q.eq("householdId", link.householdId),
              )
              .collect()
          ).map(({ createdBy, requestId, intent, ...r }) => r),
        })),
      ),
      bankSetupRequests: (
        await ctx.db
          .query("achRequests")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .collect()
      ).map(({ encryptedDetails, reviewedBy, ...r }) => r),
      household,
      duesCharges: charges,
      householdCollections: receipts.map(
        ({ createdBy, requestId, intent, ...r }) => r,
      ),
      duesAllocations: (
        await Promise.all(
          receipts.map((r) =>
            ctx.db
              .query("duesAllocations")
              .withIndex("by_receipt", (q) => q.eq("receiptId", r._id))
              .collect(),
          ),
        )
      )
        .flat()
        .map(({ createdBy, ...a }) => a),
      profile: await ctx.db
        .query("members")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .unique(),
      donations: await ctx.db
        .query("donations")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .collect(),
      subscriptions: await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .collect(),
      tickets: (
        await ctx.db
          .query("tickets")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .collect()
      ).map(({ token, ...t }) => t),
    };
  },
});
