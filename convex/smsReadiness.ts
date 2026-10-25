"use node";

import { internalAction } from "./_generated/server";
import { smsPrograms } from "./smsProgram";

// No free-form URLs or account inputs. Never returns credentials or message data.
function callback(value: unknown, expected: string) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    return {
      origin: url.origin,
      path: url.pathname
        .split("/")
        .map((part) => (/^[a-z-]{0,20}$/.test(part) ? part : "[redacted]"))
        .join("/"),
      hasQuery: !!url.search,
      hasEmbeddedCredentials: !!url.username || !!url.password,
      matchesPreparedCallback: value === expected,
    };
  } catch {
    return { invalidUrl: true };
  }
}

export const inspect = internalAction({
  args: {},
  handler: async () => {
    const account = process.env.TWILIO_SMS_ACCOUNT_SID;
    const token = process.env.TWILIO_SMS_AUTH_TOKEN;
    const expected = "https://energetic-orca-365.convex.site/sms/inbound";
    if (!account || !token) return { state: "missing_binding" };
    if (!/^AC[0-9a-f]{32}$/i.test(account))
      return { state: "unexpected_account_binding" };
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${account}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(smsPrograms.informational.sender)}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${account}:${token}`).toString("base64")}`,
          },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) {
        let errorCode: number | null = null;
        try {
          const body = await response.json();
          if (Number.isSafeInteger(body.code)) errorCode = body.code;
        } catch {}
        return {
          state: "provider_rejected",
          httpStatus: response.status,
          errorCode,
        };
      }
      const body = await response.json();
      const number = body.incoming_phone_numbers?.find(
        (n: { phone_number?: string; account_sid?: string }) =>
          n.phone_number === smsPrograms.informational.sender &&
          n.account_sid === account,
      );
      if (!number)
        return { state: "number_not_found", httpStatus: response.status };
      return {
        state: "authenticated",
        httpStatus: response.status,
        ownsExpectedNumber: true,
        callback: callback(number.sms_url, expected),
        callbackMethod: number.sms_method ?? null,
        fallback: callback(number.sms_fallback_url, expected),
        fallbackMethod: number.sms_fallback_method ?? null,
        hasSmsApplication: !!number.sms_application_sid,
        messagingServiceAssignmentReported: Object.hasOwn(
          number,
          "messaging_service_sid",
        ),
        hasMessagingService:
          typeof number.messaging_service_sid === "string" &&
          !!number.messaging_service_sid,
      };
    } catch (error) {
      return {
        state:
          error instanceof Error && error.name === "TimeoutError"
            ? "timeout"
            : "network_failure",
      };
    }
  },
});

// Fixed synthetic destination, read-only self-check; no message send or record writes.
export const inspectEligibility = internalAction({
  args: {},
  handler: async () => {
    const key = process.env.SMS_ELIGIBILITY_SHARED_SECRET;
    if (!key) return { state: "missing_binding" };
    try {
      const response = await fetch(
        "https://energetic-orca-365.convex.site/sms/eligibility",
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(10000),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            phone: "+12025550123",
            programId: "informational",
            disclosureVersion: smsPrograms.informational.version,
          }),
        },
      );
      if (!response.ok)
        return { state: "endpoint_rejected", httpStatus: response.status };
      const result = await response.json();
      if (
        !result ||
        Object.keys(result).length !== 1 ||
        typeof result.allowed !== "boolean"
      )
        return { state: "unexpected_response", httpStatus: response.status };
      return {
        state: "authenticated",
        httpStatus: response.status,
        allowed: result.allowed,
        responseIsBooleanOnly: true,
      };
    } catch {
      return { state: "connection_failed" };
    }
  },
});
