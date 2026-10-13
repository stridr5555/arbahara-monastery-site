// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { encryptBankDetails } from "../src/lib/bankEncryption";
import {
  BANK_SHARING_VERSION,
  validateBankDetails,
  validRoutingNumber,
  canTransitionAch,
  type BankDetails,
} from "../convex/achValidation";
import { decryptBankEnvelope } from "../convex/bankDetailVault";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const details: BankDetails = {
  accountHolder: "Synthetic Test Member",
  bankName: "Test Bank Only",
  routingNumber: "021000021",
  accountNumber: "000123456789",
  confirmAccountNumber: "000123456789",
  accountType: "checking",
  ownership: "personal",
  frequency: "monthly",
  sharingConsent: true,
  consentVersion: BANK_SHARING_VERSION,
};
beforeAll(() => {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 3072,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  vi.stubEnv("BANK_DETAILS_PRIVATE_KEY", privateKey);
  vi.stubEnv("BANK_DETAILS_ENABLED", "true");
  vi.stubEnv("INTEGRATION_TOKEN_KEY", "a1".repeat(32));
});
afterAll(() => vi.unstubAllEnvs());
async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const member = await ctx.db.insert("users", {
      email: "synthetic-member@example.com",
      emailVerificationTime: Date.now(),
    });
    const other = await ctx.db.insert("users", {
      email: "synthetic-other@example.com",
      emailVerificationTime: Date.now(),
    });
    const admin = await ctx.db.insert("users", {
      email: "synthetic-admin@example.com",
      emailVerificationTime: Date.now(),
    });
    const secretary = await ctx.db.insert("users", {
      email: "synthetic-secretary@example.com",
      emailVerificationTime: Date.now(),
    });
    const treasurer = await ctx.db.insert("users", {
      email: "synthetic-treasurer@example.com",
      emailVerificationTime: Date.now(),
    });
    await ctx.db.insert("roles", { userId: admin, role: "admin" });
    await ctx.db.insert("roles", { userId: secretary, role: "secretary" });
    await ctx.db.insert("roles", { userId: treasurer, role: "treasurer" });
    const household = await ctx.db.insert("households", {
      name: "Synthetic household",
      phone: "",
      address: "",
      status: "active",
      exempt: false,
      duesStart: "2026-10",
      source: "test-only",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert("householdLinks", {
      userId: member,
      householdId: household,
      linkedBy: admin,
      createdAt: Date.now(),
    });
    return { member, other, admin, secretary, treasurer, household };
  });
  return {
    t,
    ids,
    member: t.withIdentity({ subject: ids.member }),
    other: t.withIdentity({ subject: ids.other }),
    admin: t.withIdentity({ subject: ids.admin }),
    secretary: t.withIdentity({ subject: ids.secretary }),
    treasurer: t.withIdentity({ subject: ids.treasurer }),
  };
}
async function request(s: Awaited<ReturnType<typeof setup>>, d = details) {
  const c = await s.member.action(api.achActions.prepare, {});
  const encrypted = await encryptBankDetails(d, c.publicJwk, c.context);
  const args = { challengeId: c.id, ...encrypted };
  const id = await s.member.action(api.achActions.submit, args);
  return { c, args, id };
}
describe("Manual ACH validation", () => {
  it("checks routing checksum, account confirmation, enums and consent without losing leading zeros", () => {
    expect(validRoutingNumber("021000021")).toBe(true);
    for (const r of ["000000000", "021000022", "991000019", "123", "02100x021"])
      expect(validRoutingNumber(r)).toBe(false);
    expect(validateBankDetails(details).accountNumber).toBe("000123456789");
    for (const bad of [
      { confirmAccountNumber: "1234" },
      { accountNumber: "12-3456" },
      { sharingConsent: false },
      { consentVersion: "old" },
      { frequency: "weekly" },
      { accountHolder: "" },
      { accountType: "credit" },
    ])
      expect(() => validateBankDetails({ ...details, ...bad })).toThrow();
    expect(canTransitionAch("submitted", "entered_in_chase")).toBe(false);
    expect(canTransitionAch("withdrawn", "ready_for_chase")).toBe(false);
    expect(canTransitionAch("ready_for_chase", "entered_in_chase")).toBe(true);
  });
});
describe("Encrypted manual Chase request", () => {
  it("blocks self-review and self-reveal even for an administrator, and keeps bank numbers out of notes", async () => {
    const s = await setup(),
      { id } = await request(s);
    await s.t.run((ctx) =>
      ctx.db.insert("roles", { userId: s.ids.member, role: "admin" }),
    );
    const review = {
      id,
      status: "ready_for_chase" as const,
      memberMessage: "Synthetic review",
      verifiedAuthorization: true,
      authorizationReference: "TEST-AUTH",
    };
    await expect(
      s.member.mutation(api.achRecords.review, review),
    ).rejects.toThrow("Another finance reviewer");
    await expect(
      s.secretary.mutation(api.achRecords.review, {
        ...review,
        memberMessage: details.routingNumber,
      }),
    ).rejects.toThrow("bank numbers");
    await s.secretary.mutation(api.achRecords.review, review);
    await expect(
      s.member.action(api.achActions.reveal, {
        id,
        confirmPrivateScreen: true,
      }),
    ).rejects.toThrow("another reviewer's");
  });
  it("round-trips browser encryption, rejects tampering and cross-user context, and never exposes numbers in arguments", async () => {
    const s = await setup(),
      c = await s.member.action(api.achActions.prepare, {});
    const e = await encryptBankDetails(details, c.publicJwk, c.context);
    expect(JSON.stringify(e)).not.toContain(details.accountNumber);
    expect(JSON.stringify(e)).not.toContain(details.routingNumber);
    expect(decryptBankEnvelope(e, c.context)).toEqual(details);
    expect(() => decryptBankEnvelope(e, `${c.context}:other`)).toThrow();
    expect(() =>
      decryptBankEnvelope(
        { ...e, ciphertext: `${e.ciphertext.slice(0, -4)}AAAA` },
        c.context,
      ),
    ).toThrow();
    await expect(
      s.other.action(api.achActions.submit, { challengeId: c.id, ...e }),
    ).rejects.toThrow();
  });
  it("requires verified linked membership, rejects inactive/exempt households and fails closed without configuration", async () => {
    const s = await setup();
    await expect(s.t.action(api.achActions.prepare, {})).rejects.toThrow(
      "sign in",
    );
    await expect(s.other.action(api.achActions.prepare, {})).rejects.toThrow(
      "link your household",
    );
    await s.t.run((ctx) => ctx.db.patch(s.ids.household, { exempt: true }));
    await expect(s.member.action(api.achActions.prepare, {})).rejects.toThrow(
      "non-exempt",
    );
    await s.t.run((ctx) =>
      ctx.db.patch(s.ids.household, { exempt: false, status: "inactive" }),
    );
    await expect(s.member.action(api.achActions.prepare, {})).rejects.toThrow(
      "active",
    );
    const old = process.env.BANK_DETAILS_ENABLED;
    process.env.BANK_DETAILS_ENABLED = "false";
    try {
      expect(
        await s.member.action(api.achActions.availability, {}),
      ).toMatchObject({ enabled: false });
    } finally {
      process.env.BANK_DETAILS_ENABLED = old;
    }
  });
  it("stores encrypted data, masks queries/exports, makes retries idempotent and prevents duplicate household enrollment", async () => {
    const s = await setup(),
      { id, args } = await request(s);
    expect(await s.member.action(api.achActions.submit, args)).toBe(id);
    const row = await s.t.run((ctx) => ctx.db.get(id));
    expect(row?.encryptedDetails).toMatch(/^v1\./);
    expect(JSON.stringify(row)).not.toContain(details.accountNumber);
    expect(JSON.stringify(row)).not.toContain(details.routingNumber);
    expect(row?.amountCents).toBe(2000);
    const masked = await s.member.query(api.achRecords.mine, {});
    expect(masked[0].lastFour).toBe("6789");
    expect(masked[0]).not.toHaveProperty("encryptedDetails");
    expect(await s.other.query(api.achRecords.mine, {})).toHaveLength(0);
    const exportData = await s.member.query(api.members.exportMine, {});
    expect(JSON.stringify(exportData)).not.toContain("encryptedDetails");
    expect(JSON.stringify(exportData)).not.toContain(details.accountNumber);
    expect(
      (await s.secretary.query(api.achRecords.queue, {})).rows[0],
    ).not.toHaveProperty("encryptedDetails");
    await expect(s.member.query(api.achRecords.queue, {})).rejects.toThrow(
      "permission",
    );
    await expect(request(s)).rejects.toThrow("already has");
    expect(
      await s.t.run((ctx) => ctx.db.query("journals").collect()),
    ).toHaveLength(0);
    expect(
      await s.t.run((ctx) => ctx.db.query("donations").collect()),
    ).toHaveLength(0);
  });
  it("requires separate debit authorization, limits reveal roles, records an audit and never initiates money movement", async () => {
    const s = await setup(),
      { id } = await request(s);
    const review = {
      id,
      status: "ready_for_chase" as const,
      memberMessage: "Please contact the office to agree dates.",
      authorizationReference: "TEST-AUTH-ONE",
      verifiedAuthorization: false,
    };
    await expect(
      s.secretary.mutation(api.achRecords.review, review),
    ).rejects.toThrow("authorization");
    await s.secretary.mutation(api.achRecords.review, {
      ...review,
      verifiedAuthorization: true,
    });
    await expect(
      s.secretary.action(api.achActions.reveal, {
        id,
        confirmPrivateScreen: true,
      }),
    ).rejects.toThrow("permission");
    await expect(
      s.member.action(api.achActions.reveal, {
        id,
        confirmPrivateScreen: true,
      }),
    ).rejects.toThrow("permission");
    await expect(
      s.admin.action(api.achActions.reveal, {
        id,
        confirmPrivateScreen: false,
      }),
    ).rejects.toThrow("private screen");
    const revealed = await s.treasurer.action(api.achActions.reveal, {
      id,
      confirmPrivateScreen: true,
    });
    expect(revealed.accountNumber).toBe(details.accountNumber);
    expect(revealed.expiresAt).toBeLessThanOrEqual(Date.now() + 60000);
    await expect(
      s.secretary.mutation(api.achRecords.review, {
        id,
        status: "entered_in_chase",
        memberMessage: "Payor entry complete.",
        verifiedAuthorization: false,
        chasePayorReference: "TEST-PAYOR",
      }),
    ).rejects.toThrow("permission");
    await s.admin.mutation(api.achRecords.review, {
      id,
      status: "entered_in_chase",
      memberMessage: "Payor entry complete; no payment confirmed.",
      verifiedAuthorization: false,
      chasePayorReference: "TEST-PAYOR",
    });
    await expect(
      s.admin.action(api.achActions.reveal, { id, confirmPrivateScreen: true }),
    ).rejects.toThrow("ready for Chase");
    expect(
      (await s.t.run((ctx) => ctx.db.query("audit").collect())).filter(
        (r) => r.action === "ach.bank-details-viewed",
      ),
    ).toHaveLength(1);
    expect(
      await s.t.run((ctx) => ctx.db.query("receipts").collect()),
    ).toHaveLength(0);
  });
  it("withdrawal removes stored full numbers, blocks reveal, and permits a replacement account request", async () => {
    const s = await setup(),
      { id } = await request(s);
    await expect(
      s.other.mutation(api.achRecords.withdraw, { id }),
    ).rejects.toThrow("not found");
    await s.member.mutation(api.achRecords.withdraw, { id });
    expect(await s.t.run((ctx) => ctx.db.get(id))).not.toHaveProperty(
      "encryptedDetails",
    );
    expect((await s.member.query(api.achRecords.mine, {}))[0].status).toBe(
      "withdrawn",
    );
    await expect(
      s.admin.action(api.achActions.reveal, { id, confirmPrivateScreen: true }),
    ).rejects.toThrow();
    expect((await request(s, { ...details, frequency: "annual" })).id).not.toBe(
      id,
    );
    expect((await s.member.query(api.achRecords.mine, {}))[0].amountCents).toBe(
      24000,
    );
  });
  it("rejects expired challenges, changed membership and a replay with different ciphertext", async () => {
    const s = await setup(),
      { id, args, c } = await request(s);
    const changed = await encryptBankDetails(details, c.publicJwk, c.context);
    await expect(
      s.member.action(api.achActions.submit, { challengeId: c.id, ...changed }),
    ).rejects.toThrow("already used");
    const pending = await s.member.action(api.achActions.prepare, {}),
      enc = await encryptBankDetails(
        details,
        pending.publicJwk,
        pending.context,
      );
    await s.t.run((ctx) =>
      ctx.db.patch(pending.id, { expiresAt: Date.now() - 1 }),
    );
    await expect(
      s.member.action(api.achActions.submit, {
        challengeId: pending.id,
        ...enc,
      }),
    ).rejects.toThrow("expired");
    await s.t.run((ctx) =>
      ctx.db.patch(s.ids.household, { status: "inactive" }),
    );
    await expect(s.member.action(api.achActions.submit, args)).rejects.toThrow(
      "active",
    );
    expect(id).toBeTruthy();
  });
});
