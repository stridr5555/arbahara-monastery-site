// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { seal } from "../convex/tokenVault";
const mock = vi.hoisted(() => ({
  linkTokenCreate: vi.fn(),
  itemPublicTokenExchange: vi.fn(),
  itemGet: vi.fn(),
  institutionsGetById: vi.fn(),
  itemRemove: vi.fn(),
  transactionsSync: vi.fn(),
}));
vi.mock("plaid", () => ({
  Configuration: class {},
  PlaidApi: class {
    linkTokenCreate = mock.linkTokenCreate;
    itemPublicTokenExchange = mock.itemPublicTokenExchange;
    itemGet = mock.itemGet;
    institutionsGetById = mock.institutionsGetById;
    itemRemove = mock.itemRemove;
    transactionsSync = mock.transactionsSync;
  },
  PlaidEnvironments: {
    sandbox: "https://sandbox.plaid.com",
    production: "https://production.plaid.com",
  },
  Products: { Transactions: "transactions" },
  CountryCode: { Us: "US" },
}));
const modules = import.meta.glob("../convex/**/*.{ts,js}");
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PLAID_CLIENT_ID", "synthetic-client");
  vi.stubEnv("PLAID_SECRET", "synthetic-secret");
  vi.stubEnv("PLAID_ENV", "sandbox");
  vi.stubEnv("PLAID_REDIRECT_URI", "https://www.haramonastery.org/members");
  vi.stubEnv("SITE_URL", "https://www.haramonastery.org");
  vi.stubEnv("INTEGRATION_TOKEN_KEY", "a2".repeat(32));
  mock.linkTokenCreate.mockResolvedValue({
    data: { link_token: "synthetic-link" },
  });
  mock.itemGet.mockResolvedValue({
    data: { item: { item_id: "test-item", error: null } },
  });
  mock.itemPublicTokenExchange.mockResolvedValue({
    data: { access_token: "synthetic-access" },
  });
  mock.itemRemove.mockResolvedValue({ data: {} });
});
afterEach(() => vi.unstubAllEnvs());
async function setup() {
  const t = convexTest(schema, modules),
    ids = await t.run(async (ctx) => {
      const admin = await ctx.db.insert("users", {
          email: "synthetic-office@example.com",
          emailVerificationTime: Date.now(),
        }),
        member = await ctx.db.insert("users", {
          email: "synthetic-member@example.com",
          emailVerificationTime: Date.now(),
        });
      await ctx.db.insert("roles", { userId: admin, role: "admin" });
      return { admin, member };
    });
  return {
    t,
    ids,
    admin: t.withIdentity({ subject: ids.admin }),
    member: t.withIdentity({ subject: ids.member }),
  };
}
describe("Plaid provider adapter (mocked only)", () => {
  it("reports missing keys without leaking values and keeps linking disabled", async () => {
    const { admin } = await setup();
    vi.stubEnv("PLAID_SECRET", "");
    const status = await admin.query(api.bankRecords.status, {});
    expect(status.configured).toBe(false);
    expect(status.missing).toContain("PLAID_SECRET");
    expect(JSON.stringify(status)).not.toContain("synthetic-client");
    await expect(
      admin.action(api.bankActions.linkToken, {
        confirmMonasteryAccount: true,
      }),
    ).rejects.toThrow("unavailable");
    expect(mock.linkTokenCreate).not.toHaveBeenCalled();
  });
  it("requires admin and explicit authority, requests Transactions only and supports OAuth", async () => {
    const { admin, member } = await setup();
    await expect(
      member.action(api.bankActions.linkToken, {
        confirmMonasteryAccount: true,
      }),
    ).rejects.toThrow("permission");
    await expect(
      admin.action(api.bankActions.linkToken, {
        confirmMonasteryAccount: false,
      }),
    ).rejects.toThrow("Confirm");
    expect(
      await admin.action(api.bankActions.linkToken, {
        confirmMonasteryAccount: true,
      }),
    ).toBe("synthetic-link");
    expect(mock.linkTokenCreate.mock.calls[0][0]).toMatchObject({
      products: ["transactions"],
      redirect_uri: "https://www.haramonastery.org/members",
      transactions: { days_requested: 90 },
    });
    expect(JSON.stringify(mock.linkTokenCreate.mock.calls[0][0])).not.toContain(
      "auth",
    );
  });
  it("rejects cross-site OAuth and keeps an existing item's access when a duplicate token is exchanged", async () => {
    const { admin, t, ids } = await setup();
    vi.stubEnv("PLAID_REDIRECT_URI", "https://other.example/members");
    await expect(
      admin.action(api.bankActions.linkToken, {
        confirmMonasteryAccount: true,
      }),
    ).rejects.toThrow("unavailable");
    await t.mutation(internal.bankRecords.save, {
      owner: ids.admin,
      institution: "Test-only bank",
      itemId: "test-item",
      encryptedToken: seal("synthetic-access", `bank:${ids.admin}`),
    });
    await expect(
      admin.action(api.bankActions.exchange, {
        publicToken: "test-public-token",
      }),
    ).rejects.toThrow("not saved");
    expect(mock.itemRemove).not.toHaveBeenCalled();
  });
  it("creates update-mode Link with the same token and preserves the saved cursor", async () => {
    const { admin, t, ids } = await setup();
    const id = await t.mutation(internal.bankRecords.save, {
      owner: ids.admin,
      institution: "Test bank",
      encryptedToken: seal("synthetic-access", `bank:${ids.admin}`),
    });
    await t.run((ctx) =>
      ctx.db.patch(id, { cursor: "retain-cursor", status: "reconnect" }),
    );
    await admin.action(api.bankActions.linkToken, {
      confirmMonasteryAccount: true,
      connectionId: id,
    });
    expect(mock.linkTokenCreate.mock.calls[0][0]).toHaveProperty(
      "access_token",
      "synthetic-access",
    );
    expect(mock.linkTokenCreate.mock.calls[0][0]).not.toHaveProperty(
      "products",
    );
    await admin.action(api.bankActions.completeUpdate, { id });
    const row = await t.query(internal.bankRecords.grant, { id });
    expect(row?.status).toBe("connected");
    expect(row?.cursor).toBe("retain-cursor");
  });
  it("retries pagination mutations from the original cursor and commits only the complete sync", async () => {
    const { t, ids, admin } = await setup();
    const id = await t.mutation(internal.bankRecords.save, {
      owner: ids.admin,
      institution: "Test bank",
      encryptedToken: seal("synthetic-access", `bank:${ids.admin}`),
    });
    const txn = {
      transaction_id: "synthetic-txn",
      account_id: "synthetic-account",
      date: "2026-10-01",
      name: "Synthetic deposit",
      amount: -20,
      iso_currency_code: "USD",
      pending: false,
    };
    mock.transactionsSync
      .mockRejectedValueOnce({
        response: {
          data: { error_code: "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION" },
        },
      })
      .mockResolvedValueOnce({
        data: {
          added: [txn],
          modified: [],
          removed: [],
          next_cursor: "next",
          has_more: false,
        },
      });
    expect(await t.action(internal.bankActions.syncConnection, { id })).toEqual(
      { updated: 1 },
    );
    expect(mock.transactionsSync).toHaveBeenCalledTimes(2);
    expect(
      (await admin.query(api.bankRecords.rows, { id }))[0].amountCents,
    ).toBe(-2000);
    expect((await t.query(internal.bankRecords.grant, { id }))?.cursor).toBe(
      "next",
    );
    expect(
      await t.run((ctx) => ctx.db.query("journals").collect()),
    ).toHaveLength(0);
  });
});
