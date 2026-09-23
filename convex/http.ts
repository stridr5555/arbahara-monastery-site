import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
const http = httpRouter();
auth.addHttpRoutes(http);
http.route({
  path: "/archive-file",
  method: "OPTIONS",
  handler: httpAction(
    async () =>
      new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Authorization",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      }),
  ),
});
http.route({
  path: "/archive-file",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    };
    try {
      const id = new URL(request.url).searchParams.get("id");
      if (!id) return new Response("Missing record", { status: 400, headers });
      const file = await ctx.runQuery(internal.archive.authorizedFile, {
        id: id as Id<"archive">,
      });
      const blob = await ctx.storage.get(file.storageId);
      if (!blob) return new Response("Not found", { status: 404, headers });
      return new Response(blob, {
        headers: {
          ...headers,
          "Content-Type": blob.type || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${file.title.replace(/[^a-zA-Z0-9 ._-]/g, "_").slice(0, 100)}"`,
        },
      });
    } catch {
      return new Response("Access denied", { status: 403, headers });
    }
  }),
});
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) return new Response("Missing signature", { status: 400 });
    const body = await request.text();
    if (body.length > 1000000)
      return new Response("Request too large", { status: 413 });
    try {
      await ctx.runAction(internal.payments.acceptWebhook, { body, signature });
      return new Response("OK", { status: 200 });
    } catch (error) {
      const invalid = String(error).includes("Invalid webhook signature");
      return new Response(
        invalid ? "Invalid signature" : "Webhook processing failed",
        { status: invalid ? 400 : 500 },
      );
    }
  }),
});
export default http;
