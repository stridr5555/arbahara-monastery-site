import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { audit, requireRole, roleFor, clean } from "./security";
import { internal } from "./_generated/api";
import { FINANCE_ROLES } from "./finance";
import { validDate } from "./ledger";
const transaction = v.object({
  providerId: v.string(),
  accountId: v.string(),
  date: v.string(),
  name: v.string(),
  amountCents: v.number(),
  pending: v.boolean(),
});
export const status = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, FINANCE_ROLES);
    const rows = await ctx.db.query("bankConnections").collect();
    return {
      configured: !!(
        process.env.PLAID_CLIENT_ID &&
        process.env.PLAID_SECRET &&
        ["production", "sandbox"].includes(process.env.PLAID_ENV || "") &&
        /^[a-f0-9]{64}$/i.test(process.env.INTEGRATION_TOKEN_KEY || "")
      ),
      environment:
        process.env.PLAID_ENV === "sandbox" ? "sandbox" : "production",
      connections: rows.map(({ encryptedToken, cursor, owner, ...r }) => r),
    };
  },
});
export const identity = internalQuery({
  args: { userId: v.id("users"), admin: v.optional(v.boolean()) },
  handler: async (ctx, a) => {
    const user = await ctx.db.get(a.userId);
    if (!user?.emailVerificationTime)
      throw new Error("Verified sign-in required.");
    const role = await roleFor(ctx, a.userId);
    if (!(a.admin ? ["admin"] : FINANCE_ROLES).includes(role))
      throw new Error("Staff permission required.");
    return { email: user.email };
  },
});
export const save = internalMutation({
  args: {
    owner: v.id("users"),
    institution: v.string(),
    encryptedToken: v.string(),
  },
  handler: async (ctx, a) => {
    const id = await ctx.db.insert("bankConnections", {
      ...a,
      status: "connected",
      createdAt: Date.now(),
    });
    await audit(
      ctx,
      a.owner,
      "bank.connected",
      id,
      "Plaid Transactions read access; no debit origination.",
    );
    return id;
  },
});
export const grant = internalQuery({
  args: { id: v.id("bankConnections") },
  handler: (ctx, a) => ctx.db.get(a.id),
});
export const rows = query({
  args: { id: v.id("bankConnections") },
  handler: async (ctx, a) => {
    await requireRole(ctx, FINANCE_ROLES);
    return ctx.db
      .query("bankTransactions")
      .withIndex("by_connection_date", (q) => q.eq("connectionId", a.id))
      .order("desc")
      .take(300);
  },
});
export const applySync = internalMutation({
  args: {
    id: v.id("bankConnections"),
    expectedCursor: v.optional(v.string()),
    nextCursor: v.string(),
    changes: v.array(transaction),
    removedIds: v.array(v.string()),
  },
  handler: async (ctx, a) => {
    const connection = await ctx.db.get(a.id);
    if (
      !connection ||
      connection.status !== "connected" ||
      connection.cursor !== a.expectedCursor
    )
      throw new Error("Bank connection changed during sync; retry.");
    if (a.changes.length + a.removedIds.length > 2000)
      throw new Error("Bank sync batch too large.");
    for (const change of a.changes) {
      validDate(change.date);
      if (
        !Number.isSafeInteger(change.amountCents) ||
        Math.abs(change.amountCents) > 10000000000 ||
        change.name.length > 250
      )
        throw new Error("Invalid bank activity.");
      const old = await ctx.db
        .query("bankTransactions")
        .withIndex("by_provider", (q) =>
          q.eq("connectionId", a.id).eq("providerId", change.providerId),
        )
        .unique();
      const changed =
        old &&
        (old.amountCents !== change.amountCents ||
          old.date !== change.date ||
          old.pending !== change.pending);
      const values = {
        ...change,
        connectionId: a.id,
        removed: false,
        updatedAt: Date.now(),
        ...(changed
          ? {
              matchedJournalId: undefined,
              matchedBy: undefined,
              matchedAt: undefined,
            }
          : {}),
      };
      if (old) await ctx.db.patch(old._id, values);
      else await ctx.db.insert("bankTransactions", values);
      if (changed && old.matchedJournalId)
        await audit(
          ctx,
          undefined,
          "bank.match-invalidated",
          old._id,
          "Provider modified date, amount or posting state.",
        );
    }
    for (const providerId of a.removedIds) {
      const old = await ctx.db
        .query("bankTransactions")
        .withIndex("by_provider", (q) =>
          q.eq("connectionId", a.id).eq("providerId", providerId),
        )
        .unique();
      if (old) {
        await ctx.db.patch(old._id, {
          removed: true,
          matchedJournalId: undefined,
          matchedBy: undefined,
          matchedAt: undefined,
          updatedAt: Date.now(),
        });
        if (old.matchedJournalId)
          await audit(
            ctx,
            undefined,
            "bank.match-invalidated",
            old._id,
            "Provider removed transaction; original ledger unchanged.",
          );
      }
    }
    await ctx.db.patch(a.id, {
      cursor: a.nextCursor,
      lastSyncedAt: Date.now(),
      lastError: undefined,
    });
  },
});
export const result = internalMutation({
  args: {
    id: v.id("bankConnections"),
    error: v.string(),
    reconnect: v.boolean(),
  },
  handler: async (ctx, a) => {
    const old = await ctx.db.get(a.id);
    if (old && old.status !== "disconnected")
      await ctx.db.patch(a.id, {
        lastError: a.error,
        ...(a.reconnect ? { status: "reconnect" as const } : {}),
      });
  },
});
export const disconnect = internalMutation({
  args: { id: v.id("bankConnections"), actor: v.id("users") },
  handler: async (ctx, a) => {
    if (!(await ctx.db.get(a.id))) throw new Error("Bank connection missing.");
    await ctx.db.patch(a.id, {
      status: "disconnected",
      encryptedToken: undefined,
    });
    await audit(
      ctx,
      a.actor,
      "bank.disconnected",
      a.id,
      "Historical activity retained for accounting; read access stopped.",
    );
  },
});
export const match = mutation({
  args: { id: v.id("bankTransactions"), journalId: v.id("journals") },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, FINANCE_ROLES),
      txn = await ctx.db.get(a.id),
      journal = await ctx.db.get(a.journalId);
    if (
      !txn ||
      !journal ||
      txn.pending ||
      txn.removed ||
      txn.matchedJournalId ||
      journal.reversedBy
    )
      throw new Error(
        "Choose an unmatched posted transaction and an unreversed journal.",
      );
    const bankDelta = journal.lines
      .filter((l) => l.account === "1000")
      .reduce((s, l) => s + l.debitCents - l.creditCents, 0);
    if (
      bankDelta !== -txn.amountCents ||
      Math.abs(Date.parse(journal.date) - Date.parse(txn.date)) > 7 * 86400000
    )
      throw new Error(
        "Journal bank amount and date do not match this activity.",
      );
    if (
      await ctx.db
        .query("bankTransactions")
        .withIndex("by_journal", (q) => q.eq("matchedJournalId", a.journalId))
        .first()
    )
      throw new Error("Journal already matched to another bank transaction.");
    await ctx.db.patch(txn._id, {
      matchedJournalId: journal._id,
      matchedBy: actor._id,
      matchedAt: Date.now(),
    });
    await audit(ctx, actor._id, "bank.matched", txn._id, journal._id);
  },
});
export const unmatch = mutation({
  args: { id: v.id("bankTransactions"), reason: v.string() },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, FINANCE_ROLES),
      txn = await ctx.db.get(a.id);
    if (!txn?.matchedJournalId) throw new Error("No match to remove.");
    const reason = clean(a.reason, 400, "Reason");
    await ctx.db.patch(a.id, {
      matchedJournalId: undefined,
      matchedBy: undefined,
      matchedAt: undefined,
    });
    await audit(ctx, actor._id, "bank.unmatched", a.id, reason);
  },
});
export const scheduleSync = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => {
    const page = await ctx.db
      .query("bankConnections")
      .withIndex("by_status", (q) => q.eq("status", "connected"))
      .paginate({ cursor: a.cursor, numItems: 20 });
    for (const row of page.page)
      await ctx.scheduler.runAfter(0, internal.bankActions.syncConnection, {
        id: row._id,
      });
    if (!page.isDone)
      await ctx.scheduler.runAfter(1000, internal.bankRecords.scheduleSync, {
        cursor: page.continueCursor,
      });
  },
});
