"use node";
import { action } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createHash } from "node:crypto";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { bankDetailKey, decryptBankEnvelope } from "./bankDetailVault";
import { seal, unseal } from "./tokenVault";
import { validateBankDetails } from "./achValidation";
export const availability = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    enabled: boolean;
    eligible: boolean;
    familyHasSetup: boolean;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in.");
    let enabled = false;
    try {
      bankDetailKey();
      enabled = /^[a-f0-9]{64}$/i.test(process.env.INTEGRATION_TOKEN_KEY || "");
    } catch {
      /* Fail closed, without exposing configuration. */
    }
    let eligible = false;
    let familyHasSetup = false;
    try {
      const identity = await ctx.runQuery(internal.achRecords.identity, {
        userId,
      });
      eligible = !!identity.householdId;
      familyHasSetup = !!identity.familyHasSetup;
    } catch {
      /* Explain the requirement in the interface, without leaking records. */
    }
    return { enabled, eligible, familyHasSetup };
  },
});
export const prepare = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    id: Id<"achChallenges">;
    publicJwk: JsonWebKey;
    context: string;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in.");
    const { householdId } = await ctx.runQuery(internal.achRecords.identity, {
      userId,
    });
    if (!householdId) throw new ConvexError("Household is not linked.");
    const { publicJwk, keyId } = bankDetailKey();
    if (!/^[a-f0-9]{64}$/i.test(process.env.INTEGRATION_TOKEN_KEY || ""))
      throw new ConvexError("Secure storage is not configured.");
    const id = await ctx.runMutation(internal.achRecords.challenge, {
      userId,
      householdId,
      keyId,
    });
    return {
      id,
      publicJwk,
      context: `ach-intake:${userId}:${householdId}:${id}`,
    };
  },
});
export const submit = action({
  args: {
    challengeId: v.id("achChallenges"),
    wrappedKey: v.string(),
    iv: v.string(),
    ciphertext: v.string(),
  },
  handler: async (ctx, a): Promise<Id<"achRequests">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in.");
    await ctx.runQuery(internal.achRecords.identity, { userId });
    await ctx.runMutation(internal.security.limit, {
      key: `ach-submit:${userId}`,
      max: 20,
      windowMs: 3600000,
    });
    const c = await ctx.runQuery(internal.achRecords.getChallenge, {
      id: a.challengeId,
    });
    if (
      !c ||
      c.userId !== userId ||
      c.expiresAt < Date.now() ||
      c.keyId !== bankDetailKey().keyId
    )
      throw new ConvexError("This request expired. Please start again.");
    let details;
    try {
      details = validateBankDetails(
        decryptBankEnvelope(
          a,
          `ach-intake:${userId}:${c.householdId}:${c._id}`,
        ),
      );
    } catch {
      throw new ConvexError(
        "Bank details could not be validated. Check the routing number, matching account numbers and consent, then try again.",
      );
    }
    const { confirmAccountNumber, ...stored } = details;
    const fingerprint = createHash("sha256")
      .update(JSON.stringify([a.wrappedKey, a.iv, a.ciphertext]))
      .digest("hex");
    return ctx.runMutation(internal.achRecords.save, {
      challengeId: c._id,
      userId,
      fingerprint,
      encryptedDetails: seal(
        JSON.stringify(stored),
        `ach-stored:${userId}:${c.householdId}`,
      ),
      accountHolder: details.accountHolder,
      bankName: details.bankName,
      lastFour: details.accountNumber.slice(-4),
      accountType: details.accountType,
      ownership: details.ownership,
      frequency: details.frequency,
    });
  },
});
export const reveal = action({
  args: { id: v.id("achRequests"), confirmPrivateScreen: v.boolean() },
  handler: async (
    ctx,
    a,
  ): Promise<{
    accountHolder: string;
    bankName: string;
    accountType: string;
    ownership: string;
    routingNumber: string;
    accountNumber: string;
    expiresAt: number;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId || !a.confirmPrivateScreen)
      throw new ConvexError(
        "Confirm you are using a private screen for manual Chase entry.",
      );
    await ctx.runQuery(internal.achRecords.identity, {
      userId,
      finance: true,
      reveal: true,
    });
    const grant = await ctx.runMutation(internal.achRecords.revealGrant, {
      id: a.id,
      userId,
    });
    const details = JSON.parse(
      unseal(
        grant.encryptedDetails,
        `ach-stored:${grant.userId}:${grant.householdId}`,
      ),
    );
    if (
      !(await ctx.runQuery(internal.achRecords.stillRevealable, {
        id: a.id,
        updatedAt: grant.updatedAt,
      }))
    )
      throw new ConvexError("Request changed. Refresh before continuing.");
    return {
      accountHolder: details.accountHolder,
      bankName: details.bankName,
      accountType: details.accountType,
      ownership: details.ownership,
      routingNumber: details.routingNumber,
      accountNumber: details.accountNumber,
      expiresAt: Date.now() + 60000,
    };
  },
});
