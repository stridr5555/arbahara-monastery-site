import { convexAuth } from "@convex-dev/auth/server";
import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";
import Facebook from "@auth/core/providers/facebook";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

function verificationEmail(id: string) {
  return Email({
    id,
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
      const response = await fetch(`${process.env.SITE_URL}/api/member-mail`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MAIL_BRIDGE_SECRET}`,
          ...(process.env.MAIL_BRIDGE_BYPASS
            ? {
                "x-vercel-protection-bypass": process.env.MAIL_BRIDGE_BYPASS,
              }
            : {}),
        },
        body: JSON.stringify({ email: identifier, code: token, purpose: id }),
      });
      if (!response.ok)
        throw new Error(
          "We could not send your verification code. Please try again or contact the monastery office.",
        );
    },
  });
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Existing tabs can finish an in-flight code during the rollout. The new UI
    // offers passwords and OAuth, not routine email-code sign-in.
    verificationEmail("email"),
    Password({
      verify: verificationEmail("verify-email"),
      reset: verificationEmail("reset-password"),
      profile(params) {
        const email = String(params.email ?? "")
          .trim()
          .toLowerCase();
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error("Please enter a valid email address.");
        }
        // Password forwards the original params to its email subproviders.
        // Normalize both paths so codes and account IDs use the same address.
        params.email = email;
        return { email };
      },
      validatePasswordRequirements(password) {
        if (
          typeof password !== "string" ||
          password.length < 12 ||
          password.length > 128
        ) {
          throw new Error("Use a password between 12 and 128 characters.");
        }
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            profile(profile) {
              if (!profile.email || profile.email_verified !== true)
                throw new Error(
                  "Google must verify your email address before you can sign in.",
                );
              return {
                id: profile.sub,
                name: profile.name,
                email: profile.email.toLowerCase(),
                image: profile.picture,
                emailVerified: true,
              };
            },
          }),
        ]
      : []),
    ...(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET
      ? [
          Facebook({
            profile(profile) {
              if (!profile.email)
                throw new Error(
                  "Please share your email with the monastery, or sign in with a password.",
                );
              return {
                id: profile.id,
                name: profile.name,
                email: profile.email.toLowerCase(),
                image: profile.picture?.data?.url,
              };
            },
          }),
        ]
      : []),
  ],
});
