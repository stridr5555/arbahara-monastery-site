import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { smsPrograms } from "./smsProgram";

// Operator-only migration. No sends, public routes or recipient exports.
// Fetch the existing monastery broadcaster list using its existing server binding.
async function snapshot() {
  const account = process.env.TWILIO_SMS_ACCOUNT_SID;
  const token = process.env.TWILIO_SMS_AUTH_TOKEN;
  if (!account || !/^AC[0-9a-f]{32}$/i.test(account) || !token)
    throw new ConvexError("Monastery provider binding unavailable.");
  const headers = {
    Authorization: `Basic ${btoa(`${account}:${token}`)}`,
  };
  async function get(url: string): Promise<any> {
    const response = await fetch(url, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new ConvexError(`Provider read failed (${response.status}).`);
    return response.json();
  }
  const owned = await get(
    `https://api.twilio.com/2010-04-01/Accounts/${account}/IncomingPhoneNumbers.json?PhoneNumber=%2B18668276926`,
  );
  if (
    !owned.incoming_phone_numbers?.some(
      (n: any) =>
        n.phone_number === "+18668276926" && n.account_sid === account,
    )
  )
    throw new ConvexError(
      "Expected monastery SMS sender is not owned by this account.",
    );
  const base = "https://serverless.twilio.com/v1";
  const services = await get(`${base}/Services?PageSize=50`);
  if (services.meta?.next_page_url)
    throw new ConvexError("Service list needs explicit review.");
  const service = services.services?.find(
    (s: any) => s.unique_name === "telegram-voice-broadcast",
  );
  if (!service || !/^ZS[0-9a-f]{32}$/i.test(service.sid))
    throw new ConvexError("Expected broadcaster service not found.");
  const environments = await get(
    `${base}/Services/${service.sid}/Environments?PageSize=50`,
  );
  const environment = environments.environments?.find(
    (e: any) => e.unique_name === "production",
  );
  if (!environment || !/^ZE[0-9a-f]{32}$/i.test(environment.sid))
    throw new ConvexError("Expected production recipient store not found.");
  const variables = await get(
    `${base}/Services/${service.sid}/Environments/${environment.sid}/Variables?PageSize=100`,
  );
  if (variables.meta?.next_page_url)
    throw new ConvexError("Recipient store is paginated; review required.");
  const chunks = (variables.variables || [])
    .filter((x: any) => /^VOICE_RECIPIENTS_\d{3}$/.test(x.key))
    .sort((a: any, b: any) => a.key.localeCompare(b.key));
  const raw = chunks
    .map((x: any) => x.value)
    .join(",")
    .split(/[,;\s]+/)
    .filter(Boolean);
  // Match the existing broadcaster's normalization, without dropping any token.
  const normalized = raw.map((value: string) => {
    if (value.includes("*")) return "";
    const clean = value.trim().replace(/[^+0-9]/g, "");
    return clean && !clean.startsWith("+") ? `+${clean}` : clean;
  });
  const phones = [...new Set<string>(normalized)].sort();
  // The legacy bot treats META as a presence marker, not necessarily a count.
  const meta = (variables.variables || []).find(
    (x: any) => x.key === "VOICE_RECIPIENTS_META",
  );
  if (
    !phones.length ||
    phones.length > 200 ||
    !meta ||
    raw.length !== phones.length ||
    phones.some((p) => !/^\+1[2-9]\d{2}[2-9]\d{6}$/.test(p))
  )
    throw new ConvexError(
      `Recipient snapshot needs review; nothing imported. ${JSON.stringify({ chunks: chunks.length, rawCount: raw.length, distinctCount: phones.length, hasMetadata: !!meta, invalidCount: phones.filter((p) => !/^\+1[2-9]\d{2}[2-9]\d{6}$/.test(p)).length })}`,
    );
  const digest = [
    ...new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(phones.join("\n")),
      ),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  return { phones, digest };
}

export const preview = internalAction({
  args: {},
  handler: async () => {
    const result = await snapshot();
    return {
      recipients: result.phones.length,
      digest: result.digest,
      program: "informational",
      sends: 0,
    };
  },
});

export const apply = internalMutation({
  args: { phones: v.array(v.string()), digest: v.string() },
  handler: async (ctx, args) => {
    if (
      !/^[0-9a-f]{64}$/.test(args.digest) ||
      !args.phones.length ||
      args.phones.length > 200 ||
      new Set(args.phones).size !== args.phones.length ||
      args.phones.some((p) => !/^\+1[2-9]\d{2}[2-9]\d{6}$/.test(p))
    )
      throw new ConvexError("Invalid explicit recipient snapshot.");
    let added = 0,
      unchanged = 0,
      suppressed = 0;
    const recordedAt = Date.now();
    for (const phone of args.phones) {
      const stop = await ctx.db
        .query("smsPhoneSuppressions")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .unique();
      const website = await ctx.db
        .query("smsConsents")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .take(100);
      const latest = website
        .filter((x) => x.programId === "informational")
        .sort(
          (a, b) =>
            b.recordedAt - a.recordedAt ||
            Number(b.status === "withdrawn") - Number(a.status === "withdrawn"),
        )[0];
      const existing = await ctx.db
        .query("smsExistingPermissions")
        .withIndex("by_phone_program", (q) =>
          q.eq("phone", phone).eq("programId", "informational"),
        )
        .unique();
      if (
        stop?.stopped ||
        stop?.carrierStatus === "blocked" ||
        website.length === 100 ||
        latest?.status === "withdrawn" ||
        existing?.status === "withdrawn"
      ) {
        suppressed++;
        continue;
      }
      if (existing) {
        unchanged++;
        continue;
      }
      await ctx.db.insert("smsExistingPermissions", {
        phone,
        programId: "informational",
        status: "consented",
        source: "owner-confirmed-existing-sms-permission",
        snapshotDigest: args.digest,
        recordedAt,
      });
      added++;
    }
    return {
      recipients: args.phones.length,
      added,
      unchanged,
      suppressed,
      program: "informational",
      sends: 0,
    };
  },
});

export const importConfirmed = internalAction({
  args: { expectedDigest: v.string(), ownerConfirmed: v.literal(true) },
  handler: async (ctx, args): Promise<any> => {
    const result = await snapshot();
    if (result.digest !== args.expectedDigest)
      throw new ConvexError(
        "Recipient list changed; confirmation must be reviewed again.",
      );
    return ctx.runMutation(internal.smsExistingRecipients.apply, {
      phones: result.phones,
      digest: result.digest,
    });
  },
});

export const verify = internalQuery({
  args: { digest: v.string() },
  handler: async (ctx, args) => {
    const matching = await ctx.db
      .query("smsExistingPermissions")
      .withIndex("by_snapshot", (q) => q.eq("snapshotDigest", args.digest))
      .take(201);
    let allowed = 0;
    for (const row of matching) {
      const decision = await ctx.runQuery(internal.smsEligibility.allowed, {
        phone: row.phone,
        programId: "informational",
        disclosureVersion: smsPrograms.informational.version,
      });
      if (decision) allowed++;
    }
    return { recorded: matching.length, eligibleNow: allowed, sends: 0 };
  },
});
