import { query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { requireRole } from "./security";
export const auditLog = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    return ctx.db.query("audit").withIndex("by_time").order("desc").take(100);
  },
});
export const exportPage = query({
  args: {
    table: v.union(
      v.literal("members"),
      v.literal("donations"),
      v.literal("events"),
      v.literal("tickets"),
      v.literal("archive"),
      v.literal("archiveRevisions"),
      v.literal("audit"),
      v.literal("subscriptions"),
    ),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, a) => {
    await requireRole(ctx, ["admin"]);
    const result = await ctx.db.query(a.table).paginate(a.paginationOpts);
    return {
      ...result,
      page: result.page.map((row) => {
        const { token, ...rest } = row as typeof row & { token?: string };
        return rest;
      }),
    };
  },
});
