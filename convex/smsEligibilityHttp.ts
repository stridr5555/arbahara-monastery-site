import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { smsPhone } from "./smsProgram";

async function matches(left: string, right: string) {
  const encode = new TextEncoder();
  const [a, b] = await Promise.all(
    [left, right].map((value) =>
      crypto.subtle.digest("SHA-256", encode.encode(value)),
    ),
  );
  const x = new Uint8Array(a),
    y = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < x.length; i++) difference |= x[i] ^ y[i];
  return difference === 0;
}

export const eligibility = httpAction(async (ctx, request) => {
  const reply = (allowed: boolean, status = 200) =>
    new Response(JSON.stringify({ allowed }), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  const secret = process.env.SMS_ELIGIBILITY_SHARED_SECRET;
  if (!secret) return reply(false, 503);
  const authorization = request.headers.get("authorization") || "";
  if (
    !authorization.startsWith("Bearer ") ||
    authorization.length > 256 ||
    !(await matches(authorization.slice(7), secret))
  )
    return reply(false, 403);
  if (
    (request.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase() !== "application/json"
  )
    return reply(false, 415);
  if (Number(request.headers.get("content-length") || "0") > 1024)
    return reply(false, 413);
  const text = await request.text();
  if (text.length > 1024) return reply(false, 413);
  try {
    const args = JSON.parse(text);
    if (
      !args ||
      typeof args !== "object" ||
      Array.isArray(args) ||
      Object.keys(args).some(
        (key) => !["phone", "programId", "disclosureVersion"].includes(key),
      ) ||
      typeof args.phone !== "string" ||
      smsPhone(args.phone) !== args.phone ||
      !["informational", "fundraising"].includes(args.programId) ||
      typeof args.disclosureVersion !== "string" ||
      args.disclosureVersion.length > 80
    )
      return reply(false, 400);
    return reply(await ctx.runQuery(internal.smsEligibility.allowed, args));
  } catch {
    return reply(false, 400);
  }
});
