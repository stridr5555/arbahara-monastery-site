"use node";
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";
import { action, internalAction } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { seal, unseal } from "./tokenVault";
function plaid() {
  const env = process.env.PLAID_ENV;
  if (
    !process.env.PLAID_CLIENT_ID ||
    !process.env.PLAID_SECRET ||
    !(env === "production" || env === "sandbox")
  )
    throw new ConvexError("Plaid bank read access is not configured yet.");
  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[env],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
          "PLAID-SECRET": process.env.PLAID_SECRET,
        },
        timeout: 20000,
      },
    }),
  );
}
export const linkToken = action({
  args: {
    confirmMonasteryAccount: v.boolean(),
    connectionId: v.optional(v.id("bankConnections")),
  },
  handler: async (ctx, a): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in first.");
    await ctx.runQuery(internal.bankRecords.identity, { userId, admin: true });
    if (!a.confirmMonasteryAccount)
      throw new ConvexError(
        "Confirm this is the monastery’s account and you have authority to connect it.",
      );
    await ctx.runMutation(internal.security.limit, {
      key: `bank-link:${userId}`,
      max: 5,
      windowMs: 3600000,
    });
    try {
      const grant = a.connectionId
        ? await ctx.runQuery(internal.bankRecords.grant, { id: a.connectionId })
        : null;
      if (
        a.connectionId &&
        (!grant?.encryptedToken || grant.status === "disconnected")
      )
        throw new ConvexError("Connection unavailable.");
      const redirect = process.env.PLAID_REDIRECT_URI;
      if (
        !redirect ||
        new URL(redirect).protocol !== "https:" ||
        new URL(redirect).origin !==
          new URL(process.env.SITE_URL || "https://www.haramonastery.org")
            .origin
      )
        throw new ConvexError(
          "Configure a same-site HTTPS Plaid OAuth return URL.",
        );
      return (
        await plaid().linkTokenCreate({
          user: { client_user_id: userId },
          client_name: "Arbahara Monastery",
          ...(grant?.encryptedToken
            ? {
                access_token: unseal(
                  grant.encryptedToken,
                  `bank:${grant.owner}`,
                ),
              }
            : {
                products: [Products.Transactions],
                transactions: { days_requested: 90 },
              }),
          country_codes: [CountryCode.Us],
          language: "en",
          redirect_uri: redirect,
        })
      ).data.link_token;
    } catch {
      throw new ConvexError(
        "Bank linking is unavailable. Check Plaid configuration and institution eligibility.",
      );
    }
  },
});
export const completeUpdate = action({
  args: { id: v.id("bankConnections") },
  handler: async (ctx, a): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in first.");
    await ctx.runQuery(internal.bankRecords.identity, { userId, admin: true });
    const grant = await ctx.runQuery(internal.bankRecords.grant, a);
    if (!grant?.encryptedToken || grant.status === "disconnected")
      throw new ConvexError("Connection unavailable.");
    try {
      const result = (
        await plaid().itemGet({
          access_token: unseal(grant.encryptedToken, `bank:${grant.owner}`),
        })
      ).data.item;
      if (result.error) throw new ConvexError("Bank access needs attention.");
      await ctx.runMutation(internal.bankRecords.reconnected, {
        id: a.id,
        actor: userId,
      });
      await ctx.scheduler.runAfter(0, internal.bankActions.syncConnection, a);
    } catch {
      throw new ConvexError(
        "Bank access was not restored. Complete the bank verification and try again.",
      );
    }
  },
});
export const exchange = action({
  args: { publicToken: v.string() },
  handler: async (ctx, a): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in first.");
    await ctx.runQuery(internal.bankRecords.identity, { userId, admin: true });
    if (a.publicToken.length > 1000)
      throw new ConvexError("Invalid Link response.");
    let access: string | undefined;
    let existingItem = false;
    try {
      const client = plaid();
      access = (
        await client.itemPublicTokenExchange({ public_token: a.publicToken })
      ).data.access_token;
      const item = (await client.itemGet({ access_token: access })).data.item;
      existingItem = await ctx.runQuery(internal.bankRecords.hasItem, {
        itemId: item.item_id,
      });
      if (existingItem)
        throw new ConvexError("Use the existing bank connection.");
      const institution = item.institution_id
        ? (
            await client.institutionsGetById({
              institution_id: item.institution_id,
              country_codes: [CountryCode.Us],
            })
          ).data.institution.name
        : "Connected bank";
      const id = await ctx.runMutation(internal.bankRecords.save, {
        owner: userId,
        institution,
        itemId: item.item_id,
        encryptedToken: seal(access, `bank:${userId}`),
      });
      await ctx.scheduler.runAfter(0, internal.bankActions.syncConnection, {
        id,
      });
      return id;
    } catch {
      if (access && !existingItem) {
        try {
          await plaid().itemRemove({ access_token: access });
        } catch {}
      }
      throw new ConvexError(
        "Bank connection was not saved. Please try again from Link.",
      );
    }
  },
});
export const syncConnection = internalAction({
  args: { id: v.id("bankConnections") },
  handler: async (ctx, a): Promise<{ updated: number }> => {
    const grant = await ctx.runQuery(internal.bankRecords.grant, a);
    if (grant?.status !== "connected" || !grant.encryptedToken)
      return { updated: 0 };
    try {
      const client = plaid(),
        access_token = unseal(grant.encryptedToken, `bank:${grant.owner}`);
      for (let attempt = 0; attempt < 2; attempt++) {
        let cursor = grant.cursor,
          hasMore = true;
        const changes: {
            providerId: string;
            accountId: string;
            date: string;
            name: string;
            amountCents: number;
            pending: boolean;
          }[] = [],
          removedIds: string[] = [];
        try {
          while (hasMore) {
            const page = (
              await client.transactionsSync({
                access_token,
                cursor,
                count: 500,
              })
            ).data;
            for (const txn of [...page.added, ...page.modified]) {
              if (txn.iso_currency_code !== "USD")
                throw new ConvexError("Unsupported currency.");
              changes.push({
                providerId: txn.transaction_id,
                accountId: txn.account_id,
                date: txn.date,
                name: txn.name.slice(0, 250),
                amountCents: Math.round(txn.amount * 100),
                pending: txn.pending,
              });
            }
            removedIds.push(...page.removed.map((t) => t.transaction_id));
            cursor = page.next_cursor;
            hasMore = page.has_more;
            if (changes.length + removedIds.length > 2000)
              throw new ConvexError("Sync batch exceeds review limit.");
          }
          await ctx.runMutation(internal.bankRecords.applySync, {
            id: a.id,
            expectedCursor: grant.cursor,
            nextCursor: cursor || "",
            changes,
            removedIds,
          });
          return { updated: changes.length };
        } catch (error) {
          const code = (
            error as { response?: { data?: { error_code?: string } } }
          ).response?.data?.error_code;
          if (
            code === "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION" &&
            attempt === 0
          )
            continue;
          throw error;
        }
      }
      return { updated: 0 };
    } catch (error) {
      const code = (error as { response?: { data?: { error_code?: string } } })
        .response?.data?.error_code;
      const reconnect =
        code === "ITEM_LOGIN_REQUIRED" || code === "INVALID_ACCESS_TOKEN";
      await ctx.runMutation(internal.bankRecords.result, {
        id: a.id,
        error: reconnect
          ? "Bank access needs reconnection. Disconnect and reconnect through Plaid Link."
          : "Bank sync did not complete. The saved cursor and ledger are unchanged; retry later.",
        reconnect,
      });
      throw new ConvexError(
        reconnect ? "Reconnect bank access." : "Bank sync did not complete.",
      );
    }
  },
});
export const sync = action({
  args: { id: v.id("bankConnections") },
  handler: async (ctx, a): Promise<{ updated: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in first.");
    await ctx.runQuery(internal.bankRecords.identity, { userId });
    await ctx.runMutation(internal.security.limit, {
      key: `bank-sync:${userId}`,
      max: 12,
      windowMs: 3600000,
    });
    return ctx.runAction(internal.bankActions.syncConnection, a);
  },
});
export const disconnect = action({
  args: { id: v.id("bankConnections") },
  handler: async (ctx, a): Promise<{ removed: boolean }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in first.");
    await ctx.runQuery(internal.bankRecords.identity, { userId, admin: true });
    const grant = await ctx.runQuery(internal.bankRecords.grant, a);
    await ctx.runMutation(internal.bankRecords.disconnect, {
      id: a.id,
      actor: userId,
    });
    let removed = true;
    if (grant?.encryptedToken) {
      try {
        await plaid().itemRemove({
          access_token: unseal(grant.encryptedToken, `bank:${grant.owner}`),
        });
      } catch {
        removed = false;
      }
    }
    return { removed };
  },
});
