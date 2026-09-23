import { query, mutation, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUser, requireRole, audit, clean, rateLimit } from "./security";
import type { Id } from "./_generated/dataModel";
export const upcoming = query({
  args: {},
  handler: async (ctx) =>
    (
      await ctx.db
        .query("events")
        .withIndex("by_published", (q) => q.eq("published", true))
        .collect()
    )
      .filter((e) => e.endsAt > Date.now())
      .sort((a, b) => a.startsAt - b.startsAt)
      .map(({ createdBy, ...e }) => e),
});
export const all = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "checkin"]);
    return ctx.db.query("events").order("desc").take(200);
  },
});
export const save = mutation({
  args: {
    id: v.optional(v.id("events")),
    title: v.string(),
    description: v.string(),
    location: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    capacity: v.number(),
    published: v.boolean(),
    cancelled: v.boolean(),
  },
  handler: async (ctx, a) => {
    const u = await requireRole(ctx, ["admin"]);
    if (
      !Number.isInteger(a.capacity) ||
      a.capacity < 1 ||
      a.capacity > 10000 ||
      !Number.isFinite(a.startsAt) ||
      a.endsAt <= a.startsAt
    )
      throw new Error("Check the event dates and capacity.");
    const { id, ...data } = a;
    const value = {
      ...data,
      title: clean(a.title, 180, "Title"),
      description: clean(a.description, 5000, "Description"),
      location: clean(a.location, 300, "Location"),
      updatedAt: Date.now(),
    };
    if (id) {
      const old = await ctx.db.get(id);
      if (!old) throw new Error("Event not found.");
      const reserved = (
        await ctx.db
          .query("tickets")
          .withIndex("by_event", (q) => q.eq("eventId", id))
          .collect()
      ).filter((t) => t.status !== "cancelled").length;
      if (a.capacity < reserved)
        throw new Error("Capacity cannot be below existing reservations.");
      await ctx.db.patch(id, value);
    }
    const result =
      id || (await ctx.db.insert("events", { ...value, createdBy: u._id }));
    await audit(ctx, u._id, "event.saved", result);
    return result;
  },
});
export const register = action({
  args: { eventId: v.id("events"), attendeeName: v.string() },
  handler: async (ctx, a): Promise<Id<"tickets">> => {
    const id = await getAuthUserId(ctx);
    if (!id) throw new Error("Please sign in to reserve a ticket.");
    return ctx.runMutation(internal.events.reserve, {
      ...a,
      userId: id,
      token: crypto.randomUUID() + crypto.randomUUID(),
    });
  },
});
export const reserve = internalMutation({
  args: {
    eventId: v.id("events"),
    attendeeName: v.string(),
    userId: v.id("users"),
    token: v.string(),
  },
  handler: async (ctx, a) => {
    const u = await ctx.db.get(a.userId);
    if (!u?.emailVerificationTime)
      throw new Error("Verified sign-in required.");
    const event = await ctx.db.get(a.eventId);
    if (!event?.published || event.cancelled || event.endsAt < Date.now())
      throw new Error("Registration is closed for this event.");
    const old = await ctx.db
      .query("tickets")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", a.eventId).eq("userId", a.userId),
      )
      .collect();
    const active = old.find((t) => t.status !== "cancelled");
    if (active) return active._id;
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", a.eventId))
      .collect();
    if (
      tickets.filter((t) => t.status !== "cancelled").length >= event.capacity
    )
      throw new Error("This event is full. Please contact the office.");
    await rateLimit(ctx, `ticket:${a.userId}`, 20, 3600000);
    const id = await ctx.db.insert("tickets", {
      ...a,
      attendeeName: clean(a.attendeeName, 120, "Attendee name"),
      status: "reserved",
      createdAt: Date.now(),
    });
    await audit(ctx, a.userId, "ticket.reserved", id);
    return id;
  },
});
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const u = await requireUser(ctx);
    return Promise.all(
      (
        await ctx.db
          .query("tickets")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .order("desc")
          .take(200)
      ).map(async (t) => ({ ...t, event: await ctx.db.get(t.eventId) })),
    );
  },
});
export const cancel = mutation({
  args: { id: v.id("tickets") },
  handler: async (ctx, a) => {
    const u = await requireUser(ctx);
    const t = await ctx.db.get(a.id);
    if (!t || t.userId !== u._id || t.status !== "reserved")
      throw new Error("Ticket cannot be cancelled.");
    await ctx.db.patch(t._id, { status: "cancelled" });
    await audit(ctx, u._id, "ticket.cancelled", t._id);
  },
});
export const checkIn = mutation({
  args: { token: v.string(), eventId: v.id("events") },
  handler: async (ctx, a) => {
    const u = await requireRole(ctx, ["admin", "checkin"]);
    await rateLimit(ctx, `scan:${u._id}`, 120, 60000);
    const t = await ctx.db
      .query("tickets")
      .withIndex("by_token", (q) => q.eq("token", a.token))
      .unique();
    if (!t || t.eventId !== a.eventId)
      throw new Error("No valid ticket for this event.");
    const event = await ctx.db.get(t.eventId);
    if (!event || event.cancelled || !event.published)
      throw new Error("This event is cancelled or unpublished.");
    if (
      Date.now() < event.startsAt - 86400000 ||
      Date.now() > event.endsAt + 86400000
    )
      throw new Error("Check-in is outside the event admission window.");
    if (t.status === "cancelled")
      throw new Error("This ticket has been cancelled.");
    if (t.status === "checked_in")
      return {
        alreadyCheckedIn: true,
        name: t.attendeeName,
        checkedInAt: t.checkedInAt,
      };
    await ctx.db.patch(t._id, {
      status: "checked_in",
      checkedInAt: Date.now(),
      checkedInBy: u._id,
    });
    await audit(ctx, u._id, "ticket.checked_in", t._id);
    return {
      alreadyCheckedIn: false,
      name: t.attendeeName,
      checkedInAt: Date.now(),
    };
  },
});
