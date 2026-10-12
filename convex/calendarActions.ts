"use node";
import { createHash, randomBytes } from "node:crypto";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { seal, unseal } from "./tokenVault";
import { CHURCH_ZONE, upcomingGatherings } from "../src/lib/calendar";
import { applyCalendarChanges } from "../src/lib/calendarChanges";
export const CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events.owned";
function config() {
  const id = process.env.CALENDAR_GOOGLE_CLIENT_ID,
    secret = process.env.CALENDAR_GOOGLE_CLIENT_SECRET,
    redirect = process.env.CALENDAR_GOOGLE_REDIRECT_URI;
  if (!id || !secret || !redirect || !process.env.INTEGRATION_TOKEN_KEY)
    throw new Error(
      "Google primary-calendar sync is not configured yet. You can download the calendar instead.",
    );
  return { id, secret, redirect };
}
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
async function token(body: Record<string, string>) {
  const c = config(),
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: c.id,
        client_secret: c.secret,
        ...body,
      }),
      signal: AbortSignal.timeout(15000),
    });
  if (!response.ok)
    throw new Error(
      response.status === 400
        ? "Calendar reconnect required."
        : "Google authorization is temporarily unavailable.",
    );
  return (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    scope?: string;
    expires_in: number;
  };
}
export const connect = action({
  args: { consent: v.boolean() },
  handler: async (ctx, a) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    if (!a.consent)
      throw new Error("Confirm primary-calendar access before connecting.");
    const c = config();
    await ctx.runMutation(internal.security.limit, {
      key: `calendar-connect:${userId}`,
      max: 5,
      windowMs: 3600000,
    });
    const state = randomBytes(32).toString("base64url"),
      verifier = randomBytes(32).toString("base64url"),
      stateHash = hash(state);
    await ctx.runMutation(internal.calendarRecords.begin, {
      userId,
      stateHash,
      encryptedVerifier: seal(
        verifier,
        `calendar-state:${userId}:${stateHash}`,
      ),
    });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: c.id,
      redirect_uri: c.redirect,
      response_type: "code",
      scope: CALENDAR_SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
    }).toString();
    return url.href;
  },
});
export const complete = internalAction({
  args: { state: v.string(), code: v.optional(v.string()) },
  handler: async (ctx, a) => {
    if (a.state.length > 200 || (a.code?.length || 0) > 4000)
      throw new Error("Invalid calendar authorization.");
    const stateHash = hash(a.state),
      pending = await ctx.runMutation(internal.calendarRecords.consume, {
        stateHash,
      });
    try {
      if (!a.code) throw new Error("Calendar authorization was not completed.");
      const verifier = unseal(
          pending.encryptedVerifier,
          `calendar-state:${pending.userId}:${stateHash}`,
        ),
        tokens = await token({
          code: a.code,
          grant_type: "authorization_code",
          redirect_uri: config().redirect,
          code_verifier: verifier,
        });
      if (
        !tokens.refresh_token ||
        !tokens.scope?.split(" ").includes(CALENDAR_SCOPE)
      )
        throw new Error(
          "Calendar permission or offline access was not granted.",
        );
      await ctx.runMutation(internal.calendarRecords.save, {
        userId: pending.userId,
        nonce: stateHash,
        encryptedRefreshToken: seal(
          tokens.refresh_token,
          `calendar:${pending.userId}`,
        ),
        scope: tokens.scope,
      });
      await ctx.scheduler.runAfter(0, internal.calendarActions.syncConnection, {
        userId: pending.userId,
      });
      return { ok: true };
    } catch {
      await ctx.runMutation(internal.calendarRecords.result, {
        userId: pending.userId,
        error: "Calendar connection was not completed. Please reconnect.",
        reconnect: true,
      });
      return { ok: false };
    }
  },
});
async function synchronize(ctx: ActionCtx, userId: Id<"users">) {
  const grant = await ctx.runQuery(internal.calendarRecords.grant, { userId });
  if (grant?.status !== "connected" || !grant.encryptedRefreshToken)
    throw new Error("Connect your Google calendar first.");
  try {
    const refreshed = await token({
        grant_type: "refresh_token",
        refresh_token: unseal(
          grant.encryptedRefreshToken,
          `calendar:${userId}`,
        ),
      }),
      changes = await ctx.runQuery(internal.calendarRecords.syncData, {});
    const events = applyCalendarChanges(
      upcomingGatherings(new Date(Date.now() - 7 * 86400000), 13),
      changes,
    );
    let count = 0;
    for (const e of events) {
      const active = await ctx.runQuery(internal.calendarRecords.grant, {
        userId,
      });
      if (active?.status !== "connected")
        throw new Error("Calendar was disconnected.");
      const id = hash(`${userId}:${e.id}`).slice(0, 40),
        base =
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        headers = {
          Authorization: `Bearer ${refreshed.access_token}`,
          "Content-Type": "application/json",
        };
      const existing = await fetch(`${base}/${id}`, {
        headers,
        signal: AbortSignal.timeout(15000),
      });
      if (!existing.ok && existing.status !== 404 && existing.status !== 410)
        throw new Error(
          existing.status === 401
            ? "Calendar reconnect required."
            : "Google Calendar sync is temporarily unavailable.",
        );
      if (e.cancelled) {
        if (existing.ok) {
          const removed = await fetch(`${base}/${id}`, {
            method: "DELETE",
            headers,
            signal: AbortSignal.timeout(15000),
          });
          if (!removed.ok && removed.status !== 404 && removed.status !== 410)
            throw new Error("Calendar cancellation could not be synchronized.");
        }
        continue;
      }
      if (existing.ok) {
        const found = await existing.json();
        if (found.status!=="cancelled" && found.extendedProperties?.private?.arbaharaOccurrence !== e.id)
          throw new Error("An unrelated calendar event cannot be overwritten.");
      }
      const body = {
        status:"confirmed",
        summary: e.title,
        location: e.location,
        description: `${e.ethiopian}. ${e.description}\nManaged by Arbahara. Disconnect in the member portal to stop updates.`,
        start: {
          dateTime: new Date(e.startsAt).toISOString(),
          timeZone: CHURCH_ZONE,
        },
        end: {
          dateTime: new Date(e.endsAt).toISOString(),
          timeZone: CHURCH_ZONE,
        },
        extendedProperties: { private: { arbaharaOccurrence: e.id } },
      };
      const saved = await fetch(existing.ok ? `${base}/${id}` : base, {
        method: existing.ok ? "PATCH" : "POST",
        headers,
        body: JSON.stringify(existing.ok ? body : { id, ...body }),
        signal: AbortSignal.timeout(15000),
      });
      if (saved.status === 409) {
        /* A concurrent sync inserted the same stable ID; the next daily sync will update it. */ continue;
      }
      if (!saved.ok)
        throw new Error(
          saved.status === 401
            ? "Calendar reconnect required."
            : "Google Calendar could not save a gathering.",
        );
      count++;
    }
    await ctx.runMutation(internal.calendarRecords.result, { userId });
    return { updated: count };
  } catch (error) {
    const reconnect =
      error instanceof Error && error.message.includes("reconnect");
    await ctx.runMutation(internal.calendarRecords.result, {
      userId,
      error: reconnect
        ? "Google access expired or was revoked. Reconnect your calendar."
        : "Sync was not completed. Try again; existing events are preserved.",
      reconnect,
    });
    throw new Error(
      reconnect
        ? "Reconnect Google Calendar to continue."
        : "Calendar sync did not complete. Please try again.",
    );
  }
}
export const sync = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    await ctx.runMutation(internal.security.limit, {
      key: `calendar-sync:${userId}`,
      max: 12,
      windowMs: 3600000,
    });
    return synchronize(ctx, userId);
  },
});
export const syncConnection = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, a) => {
    try {
      return await synchronize(ctx, a.userId);
    } catch {
      return { updated: 0 };
    }
  },
});
export const disconnect = action({
  args: {},
  handler: async (ctx): Promise<{ revoked: boolean }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    const grant = await ctx.runQuery(internal.calendarRecords.grant, {
      userId,
    });
    await ctx.runMutation(internal.calendarRecords.disconnect, { userId });
    let revoked = true;
    if (grant?.encryptedRefreshToken) {
      try {
        const response = await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: unseal(grant.encryptedRefreshToken, `calendar:${userId}`),
          }),
          signal: AbortSignal.timeout(15000),
        });
        revoked = response.ok;
      } catch {
        revoked = false;
      }
    }
    return { revoked };
  },
});
