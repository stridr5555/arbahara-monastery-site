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
  },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx);
    if (!a.consent) throw new Error("Please accept the privacy notice.");
    const name = clean(a.name, 120, "Name");
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
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      email: u.email,
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
