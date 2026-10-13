import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { seal, unseal } from "../convex/tokenVault";
import { CALENDAR_SCOPE } from "../convex/calendarActions";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-12T18:00:00Z"));
  vi.stubEnv("INTEGRATION_TOKEN_KEY", "ab".repeat(32));
  vi.stubEnv("CALENDAR_GOOGLE_CLIENT_ID", "test-client");
  vi.stubEnv("CALENDAR_GOOGLE_CLIENT_SECRET", "test-secret");
  vi.stubEnv(
    "CALENDAR_GOOGLE_REDIRECT_URI",
    "https://example.test/calendar/google/callback",
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
async function setup() {
  const t = convexTest(schema, modules);
  const id = await t.run((ctx) =>
    ctx.db.insert("users", {
      email: "member@example.test",
      emailVerificationTime: Date.now(),
    }),
  );
  return { t, id, member: t.withIdentity({ subject: id }) };
}
describe("Primary calendar consent and sync", () => {
  it("serves a complete 12-month dated export as a real calendar attachment", async () => {
    const { t } = await setup();
    const response = await t.fetch("/calendar.ics");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("attachment");
    const text = await response.text();
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text.match(/BEGIN:VEVENT/g) || []).toHaveLength(24);
    expect(text).toContain("arbahara-mahiber-2020-1@haramonastery.org");
    expect(text).not.toContain("RRULE:");
    expect(text.replace(/\r\n /g, "")).toContain("Dial 727-731-9374 to join");
  });
  it("encrypts tokens with provider/user binding and rejects tampering", () => {
    const encrypted = seal("not-a-real-token", "calendar:alice");
    expect(encrypted).not.toContain("not-a-real-token");
    expect(unseal(encrypted, "calendar:alice")).toBe("not-a-real-token");
    expect(() => unseal(encrypted, "calendar:bob")).toThrow();
    expect(() =>
      unseal(encrypted.slice(0, -3) + "xyz", "calendar:alice"),
    ).toThrow();
  });
  it("requires sign-in and separate consent; stores only a hash of OAuth state", async () => {
    const { t, member } = await setup();
    await expect(
      t.action(api.calendarActions.connect, { consent: true }),
    ).rejects.toThrow("Sign in");
    await expect(
      member.action(api.calendarActions.connect, { consent: false }),
    ).rejects.toThrow("Confirm");
    const url = new URL(
      await member.action(api.calendarActions.connect, { consent: true }),
    );
    expect(url.searchParams.get("scope")).toBe(CALENDAR_SCOPE);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    const state = url.searchParams.get("state")!;
    const stored = await t.run((ctx) =>
      ctx.db.query("calendarOAuthStates").unique(),
    );
    expect(stored?.stateHash).toBe(
      createHash("sha256").update(state).digest("hex"),
    );
    expect(JSON.stringify(stored)).not.toContain(state);
  });
  it("consumes state once and disconnect invalidates in-flight consent", async () => {
    const { t, member } = await setup();
    const url = new URL(
      await member.action(api.calendarActions.connect, { consent: true }),
    );
    const stateHash = createHash("sha256")
      .update(url.searchParams.get("state")!)
      .digest("hex");
    await member.action(api.calendarActions.disconnect, {});
    await expect(
      t.mutation(internal.calendarRecords.consume, { stateHash }),
    ).rejects.toThrow("disconnected");
  });
  it("writes stable IDs only to primary, updates without duplicating and revokes offline access", async () => {
    const { t, id, member } = await setup();
    const saved = new Map<string, Record<string, unknown>>();
    const calls: { url: string; method: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input),
          method = init?.method || "GET";
        calls.push({ url, method });
        if (url.includes("oauth2.googleapis.com/token"))
          return Response.json({
            access_token: "test-access",
            refresh_token: "test-refresh",
            scope: CALENDAR_SCOPE,
            expires_in: 3600,
          });
        if (url.includes("oauth2.googleapis.com/revoke"))
          return new Response(null, { status: 200 });
        const key = url.split("/").at(-1)!;
        if (method === "GET")
          return saved.has(key)
            ? Response.json(saved.get(key))
            : new Response(null, { status: 404 });
        if (method === "POST") {
          const body = JSON.parse(String(init?.body));
          saved.set(body.id, body);
          return Response.json(body);
        }
        if (method === "PATCH") {
          const body = { ...saved.get(key), ...JSON.parse(String(init?.body)) };
          saved.set(key, body);
          return Response.json(body);
        }
        if (method === "DELETE") {
          saved.delete(key);
          return new Response(null, { status: 204 });
        }
        throw new Error("Unexpected test request");
      }),
    );
    const url = new URL(
        await member.action(api.calendarActions.connect, { consent: true }),
      ),
      state = url.searchParams.get("state")!;
    expect(
      (
        await t.action(internal.calendarActions.complete, {
          state,
          code: "test-code",
        })
      ).ok,
    ).toBe(true);
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    const before = saved.size;
    expect(before).toBeGreaterThan(20);
    const mahiber = [...saved.values()].find(
      (e) => e.summary === "Arbahara Teleconference Mahiber",
    )!;
    expect(mahiber.location).toContain("727-731-9374");
    expect(mahiber.description).toContain("Dial 727-731-9374 to join");
    await member.action(api.calendarActions.sync, {});
    expect(saved.size).toBe(before);
    expect(
      calls
        .filter((c) => c.url.includes("/calendar/v3/"))
        .every((c) => c.url.includes("/calendars/primary/events")),
    ).toBe(true);
    expect([...saved.keys()].every((k) => /^[a-f0-9]{40}$/.test(k))).toBe(true);
    const grant = await t.query(internal.calendarRecords.grant, { userId: id });
    expect(grant?.encryptedRefreshToken).not.toContain("test-refresh");
    expect((await member.query(api.calendarRecords.status, {})).status).toBe(
      "connected",
    );
    expect(
      (await member.action(api.calendarActions.disconnect, {})).revoked,
    ).toBe(true);
    expect(
      (await t.query(internal.calendarRecords.grant, { userId: id }))
        ?.encryptedRefreshToken,
    ).toBeUndefined();
    expect(saved.size).toBe(before);
    await expect(
      t.action(internal.calendarActions.complete, { state, code: "test-code" }),
    ).rejects.toThrow("expired");
  });
});
