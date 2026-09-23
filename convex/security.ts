import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
export async function requireUser(ctx: Pick<QueryCtx, "auth" | "db">) {
  const id = await getAuthUserId(ctx);
  if (!id) throw new ConvexError("Please sign in.");
  const user = await ctx.db.get(id);
  if (!user?.email || !user.emailVerificationTime)
    throw new ConvexError("Please verify your email.");
  return user;
}
export async function roleFor(
  ctx: Pick<QueryCtx, "auth" | "db">,
  userId: import("./_generated/dataModel").Id<"users">,
) {
  const user = await ctx.db.get(userId);
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (
    user?.emailVerificationTime &&
    admins.includes(user.email?.toLowerCase() || "")
  )
    return "admin" as const;
  return (
    (
      await ctx.db
        .query("roles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique()
    )?.role || "member"
  );
}
export async function requireRole(
  ctx: Pick<QueryCtx, "auth" | "db">,
  roles: string[],
) {
  const user = await requireUser(ctx);
  const role = await roleFor(ctx, user._id);
  if (!roles.includes(role))
    throw new ConvexError("You do not have permission to do this.");
  return user;
}
export async function audit(
  ctx: MutationCtx,
  actor: import("./_generated/dataModel").Id<"users"> | undefined,
  action: string,
  target: string,
  details = "",
) {
  await ctx.db.insert("audit", {
    actor,
    action,
    target,
    details,
    createdAt: Date.now(),
  });
}
export function clean(value: string, max: number, label: string) {
  const s = value.trim();
  if (!s || s.length > max)
    throw new ConvexError(`${label} must be between 1 and ${max} characters.`);
  return s;
}
export async function rateLimit(
  ctx: MutationCtx,
  key: string,
  max: number,
  windowMs: number,
) {
  const old = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (old && Date.now() - old.windowStart < windowMs) {
    if (old.count >= max)
      throw new ConvexError("Too many attempts. Please try again later.");
    await ctx.db.patch(old._id, { count: old.count + 1 });
  } else if (old)
    await ctx.db.patch(old._id, { count: 1, windowStart: Date.now() });
  else
    await ctx.db.insert("rateLimits", {
      key,
      count: 1,
      windowStart: Date.now(),
    });
}
export const limit = internalMutation({
  args: { key: v.string(), max: v.number(), windowMs: v.number() },
  handler: (ctx, a) => rateLimit(ctx, a.key, a.max, a.windowMs),
});
