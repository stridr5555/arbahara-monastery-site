import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { audit, clean, requireRole, requireUser } from "./security";
import { civilDate, gatheringsBetween } from "../src/lib/calendar";
export const status = query({
  args: {},
  handler: async (ctx) => {
    const u = await requireUser(ctx),
      row = await ctx.db
        .query("calendarConnections")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .unique();
    return {
      configured: !!(
        process.env.CALENDAR_GOOGLE_CLIENT_ID &&
        process.env.CALENDAR_GOOGLE_CLIENT_SECRET &&
        process.env.CALENDAR_GOOGLE_REDIRECT_URI &&
        /^[a-f0-9]{64}$/i.test(process.env.INTEGRATION_TOKEN_KEY || "")
      ),
      status: row?.status || "disconnected",
      lastSyncedAt: row?.lastSyncedAt,
      lastError: row?.lastError,
    };
  },
});
export const changes = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("calendarChanges").take(501);
    if (rows.length > 500)
      throw new Error("Calendar updates require archival review.");
    return rows.map(({ updatedBy, _creationTime, ...row }) => row);
  },
});
export const change = mutation({
  args: {
    eventId: v.string(),
    originalDate: v.string(),
    cancelled: v.boolean(),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    location: v.optional(v.string()),
    note: v.string(),
  },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, ["admin", "secretary"]);
    civilDate(a.originalDate);
    const original = gatheringsBetween(a.originalDate, a.originalDate).find(
      (e) => e.id === a.eventId,
    );
    if (!original) throw new Error("Choose a real gathering occurrence.");
    const starts = a.startsAt ?? original.startsAt,
      ends = a.endsAt ?? original.endsAt;
    if (
      !Number.isSafeInteger(starts) ||
      !Number.isSafeInteger(ends) ||
      ends <= starts ||
      ends - starts > 12 * 3600000 ||
      Math.abs(starts - original.startsAt) > 7 * 86400000
    )
      throw new Error(
        "Use a valid gathering time within seven days of its original occurrence.",
      );
    const note = clean(a.note, 500, "Public change note");
    if ((a.location?.length || 0) > 500) throw new Error("Location too long.");
    const old = await ctx.db
        .query("calendarChanges")
        .withIndex("by_event", (q) => q.eq("eventId", a.eventId))
        .unique(),
      values = { ...a, note, updatedAt: Date.now(), updatedBy: actor._id };
    const id = old ? old._id : await ctx.db.insert("calendarChanges", values);
    if (old) await ctx.db.patch(id, values);
    await audit(ctx, actor._id, "calendar.changed", a.eventId, note);
    await ctx.scheduler.runAfter(0, internal.calendarRecords.scheduleSync, {
      cursor: null,
    });
    return id;
  },
});
export const begin = internalMutation({
  args: {
    userId: v.id("users"),
    stateHash: v.string(),
    encryptedVerifier: v.string(),
  },
  handler: async (ctx, a) => {
    const user = await ctx.db.get(a.userId);
    if (!user?.emailVerificationTime)
      throw new Error("Verified sign-in required.");
    const old = await ctx.db
      .query("calendarConnections")
      .withIndex("by_user", (q) => q.eq("userId", a.userId))
      .unique();
    const values = {
      nonce: a.stateHash,
      status: "connecting" as const,
      lastError: undefined,
    };
    if (old) await ctx.db.patch(old._id, values);
    else
      await ctx.db.insert("calendarConnections", {
        userId: a.userId,
        ...values,
      });
    await ctx.db.insert("calendarOAuthStates", {
      ...a,
      expiresAt: Date.now() + 10 * 60000,
    });
  },
});
export const consume = internalMutation({
  args: { stateHash: v.string() },
  handler: async (ctx, a) => {
    const state = await ctx.db
      .query("calendarOAuthStates")
      .withIndex("by_hash", (q) => q.eq("stateHash", a.stateHash))
      .unique();
    if (!state || state.expiresAt < Date.now())
      throw new Error("Calendar authorization expired. Start again.");
    const connection = await ctx.db
      .query("calendarConnections")
      .withIndex("by_user", (q) => q.eq("userId", state.userId))
      .unique();
    if (connection?.nonce !== a.stateHash)
      throw new Error("Calendar authorization was superseded or disconnected.");
    await ctx.db.delete(state._id);
    return state;
  },
});
export const save = internalMutation({
  args: {
    userId: v.id("users"),
    nonce: v.string(),
    encryptedRefreshToken: v.string(),
    scope: v.string(),
  },
  handler: async (ctx, a) => {
    const old = await ctx.db
      .query("calendarConnections")
      .withIndex("by_user", (q) => q.eq("userId", a.userId))
      .unique();
    if (!old || old.nonce !== a.nonce)
      throw new Error("Calendar authorization no longer active.");
    await ctx.db.patch(old._id, {
      status: "connected",
      encryptedRefreshToken: a.encryptedRefreshToken,
      scope: a.scope,
      consentedAt: Date.now(),
      nonce: undefined,
      lastError: undefined,
    });
    await audit(
      ctx,
      a.userId,
      "calendar.connected",
      old._id,
      "Primary personal calendar; separate OAuth consent.",
    );
  },
});
export const grant = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, a) =>
    ctx.db
      .query("calendarConnections")
      .withIndex("by_user", (q) => q.eq("userId", a.userId))
      .unique(),
});
export const syncData = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("calendarChanges").take(501);
    if (rows.length > 500) throw new Error("Calendar update limit exceeded.");
    return rows;
  },
});
export const result = internalMutation({
  args: {
    userId: v.id("users"),
    error: v.optional(v.string()),
    reconnect: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    const row = await ctx.db
      .query("calendarConnections")
      .withIndex("by_user", (q) => q.eq("userId", a.userId))
      .unique();
    if (!row || row.status === "disconnected") return;
    await ctx.db.patch(row._id, {
      ...(a.reconnect ? { status: "reconnect" as const } : {}),
      lastError: a.error,
      ...(!a.error ? { lastSyncedAt: Date.now() } : {}),
    });
  },
});
export const disconnect = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, a) => {
    const row = await ctx.db
      .query("calendarConnections")
      .withIndex("by_user", (q) => q.eq("userId", a.userId))
      .unique();
    if (!row) return;
    await ctx.db.patch(row._id, {
      status: "disconnected",
      encryptedRefreshToken: undefined,
      nonce: undefined,
      lastError: undefined,
    });
    await audit(
      ctx,
      a.userId,
      "calendar.disconnected",
      row._id,
      "Existing calendar events retained; automatic updates stopped.",
    );
  },
});
export const scheduleSync = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => {
    const page = await ctx.db
      .query("calendarConnections")
      .withIndex("by_status", (q) => q.eq("status", "connected"))
      .paginate({ numItems: 25, cursor: a.cursor });
    for (const row of page.page)
      await ctx.scheduler.runAfter(0, internal.calendarActions.syncConnection, {
        userId: row.userId,
      });
    if (!page.isDone)
      await ctx.scheduler.runAfter(
        1000,
        internal.calendarRecords.scheduleSync,
        { cursor: page.continueCursor },
      );
  },
});
