import { convexAuth } from "@convex-dev/auth/server";
import { Email } from "@convex-dev/auth/providers/Email";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Email({
      id: "email",
      maxAge: 15 * 60,
      async generateVerificationToken() {
        const bytes = new Uint32Array(1);
        crypto.getRandomValues(bytes);
        return String(bytes[0] % 100000000).padStart(8, "0");
      },
      async sendVerificationRequest({ identifier, token }, ctx?: ActionCtx) {
        if (
          !/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(
            identifier,
          ) ||
          identifier.length > 254
        )
          throw new Error("Please enter a valid email address.");
        if (!ctx) throw new Error("Authentication context unavailable.");
        await ctx.runMutation(internal.security.limit, {
          key: `email:${identifier.toLowerCase()}`,
          max: 5,
          windowMs: 900000,
        });
        await ctx.runMutation(internal.security.limit, {
          key: "auth:hour",
          max: 60,
          windowMs: 3600000,
        });
        await ctx.runMutation(internal.security.limit, {
          key: "auth:day",
          max: 200,
          windowMs: 86400000,
        });
        const response = await fetch(
          `${process.env.SITE_URL}/api/member-mail`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.MAIL_BRIDGE_SECRET}`,
              ...(process.env.MAIL_BRIDGE_BYPASS
                ? {
                    "x-vercel-protection-bypass":
                      process.env.MAIL_BRIDGE_BYPASS,
                  }
                : {}),
            },
            body: JSON.stringify({ email: identifier, code: token }),
          },
        );
        if (!response.ok)
          throw new Error(
            "We could not send your sign-in code. Please try again or contact the monastery office.",
          );
      },
    }),
  ],
});
