"use node";

import twilio from "twilio";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { smsPhone, smsPrograms } from "./smsProgram";

const empty = '<?xml version="1.0" encoding="UTF-8"?><Response/>';
const stopWords = new Set([
  "STOP",
  "STOPALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
  "REVOKE",
  "OPTOUT",
]);
const xml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// Internal only. This action never instantiates a Twilio API client or sends a text.
export const accept = internalAction({
  args: { url: v.string(), body: v.string(), signature: v.string() },
  handler: async (ctx, args): Promise<{ status: number; twiml: string }> => {
    const denied = (status: number) => ({ status, twiml: empty });
    if (process.env.SMS_TWILIO_INBOUND_ENABLED !== "true") return denied(503);
    const authToken = process.env.TWILIO_SMS_AUTH_TOKEN;
    const accountSid = process.env.TWILIO_SMS_ACCOUNT_SID;
    const webhookUrl = process.env.TWILIO_SMS_WEBHOOK_URL;
    const serviceSid = process.env.TWILIO_SMS_MESSAGING_SERVICE_SID;
    if (serviceSid && !/^MG[0-9a-f]{32}$/i.test(serviceSid)) return denied(503);
    if (
      !authToken ||
      !accountSid ||
      !/^AC[0-9a-f]{32}$/i.test(accountSid) ||
      !webhookUrl
    )
      return denied(503);
    try {
      const canonical = new URL(webhookUrl);
      if (
        canonical.protocol !== "https:" ||
        canonical.pathname !== "/sms/inbound" ||
        canonical.username ||
        canonical.password ||
        canonical.hash
      )
        return denied(503);
    } catch {
      return denied(503);
    }
    // Direct HTTPS callback only. Never rebuild this from Host or X-Forwarded-*.
    if (args.url !== webhookUrl || args.body.length > 65536) return denied(400);
    const fields = new URLSearchParams(args.body);
    const params: Record<string, string> = Object.create(null);
    for (const [key, value] of fields) {
      if (Object.hasOwn(params, key)) return denied(400);
      params[key] = value;
    }
    if (
      !/^[A-Za-z0-9+/]{27}=$/.test(args.signature) ||
      !twilio.validateRequest(authToken, args.signature, webhookUrl, params)
    )
      return denied(403);
    if (
      params.AccountSid !== accountSid ||
      params.To !== smsPrograms.informational.sender ||
      (params.MessagingServiceSid || "") !== (serviceSid || "")
    )
      return denied(403);
    if (!/^(SM|MM)[0-9a-f]{32}$/i.test(params.MessageSid || ""))
      return denied(400);
    let phone: string;
    try {
      phone = smsPhone(params.From || "");
    } catch {
      return denied(400);
    }
    if (phone !== params.From) return denied(400);
    const type = params.OptOutType;
    if (type && !["STOP", "START", "HELP"].includes(type)) return denied(400);
    const word = (params.Body || "").trim().toUpperCase();
    // Advanced Opt-Out has already replied. Toll-free YES never unblocks.
    const kind =
      type === "STOP"
        ? "STOP"
        : type === "HELP"
          ? "HELP"
          : type === "START"
            ? ["START", "UNSTOP"].includes(word)
              ? "START"
              : "ignored"
            : stopWords.has(word)
              ? "STOP"
              : ["START", "UNSTOP"].includes(word)
                ? "START"
                : word === "HELP"
                  ? "HELP"
                  : "ignored";
    const result = await ctx.runMutation(internal.smsInbound.record, {
      messageSid: params.MessageSid,
      accountSid,
      phone,
      sender: params.To,
      kind,
      providerHandled: !!type,
    });
    if (result.duplicate || kind !== "HELP" || type || result.suppressed)
      return denied(200);
    // No custom reply until separately reviewed and explicitly enabled.
    const helpText = process.env.SMS_TWILIO_HELP_REPLY_TEXT;
    if (
      process.env.SMS_TWILIO_HELP_REPLY_ENABLED !== "true" ||
      !helpText ||
      helpText.length > 1000
    )
      return denied(200);
    return {
      status: 200,
      twiml: `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xml(helpText)}</Message></Response>`,
    };
  },
});
