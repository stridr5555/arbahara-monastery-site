import { query } from "./_generated/server";
import { requireRole } from "./security";
import { FINANCE_ROLES } from "./finance";
export const workQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, FINANCE_ROLES);
    const [households, gifts, requests, ready] = await Promise.all([
      ctx.db
        .query("households")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .take(101),
      ctx.db
        .query("donations")
        .withIndex("by_status", (q) => q.eq("status", "reported"))
        .take(101),
      ctx.db
        .query("achRequests")
        .withIndex("by_status", (q) => q.eq("status", "submitted"))
        .take(101),
      ctx.db
        .query("achRequests")
        .withIndex("by_status", (q) => q.eq("status", "ready_for_chase"))
        .take(101),
    ]);
    return {
      households: households.length,
      gifts: gifts.length,
      requests: requests.length,
      ready: ready.length,
    };
  },
});
