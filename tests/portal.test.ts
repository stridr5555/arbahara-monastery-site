import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { validateGift } from "../convex/donations";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const admin = await ctx.db.insert("users", {
      email: "admin@example.com",
      emailVerificationTime: Date.now(),
    });
    const alice = await ctx.db.insert("users", {
      email: "alice@example.com",
      emailVerificationTime: Date.now(),
    });
    const bob = await ctx.db.insert("users", {
      email: "bob@example.com",
      emailVerificationTime: Date.now(),
    });
    await ctx.db.insert("roles", { userId: admin, role: "admin" });
    const event = await ctx.db.insert("events", {
      title: "Test gathering",
      description: "Test only",
      location: "Test hall",
      startsAt: Date.now() + 3600000,
      endsAt: Date.now() + 7200000,
      capacity: 1,
      published: true,
      cancelled: false,
      createdBy: admin,
      updatedAt: Date.now(),
    });
    return { admin, alice, bob, event };
  });
  return {
    t,
    ids,
    admin: t.withIdentity({ subject: ids.admin }),
    alice: t.withIdentity({ subject: ids.alice }),
    bob: t.withIdentity({ subject: ids.bob }),
  };
}
describe("Member and financial permissions", () => {
  it("rejects unverified identities and member access to administrative exports", async () => {
    const { t, alice } = await fixture();
    const id = await t.run((ctx) =>
      ctx.db.insert("users", { email: "unverified@example.com" }),
    );
    await expect(
      t.withIdentity({ subject: id }).query(api.members.me, {}),
    ).rejects.toThrow("verify");
    await expect(
      alice.query(api.administration.exportPage, {
        table: "members",
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).rejects.toThrow("permission");
    await expect(
      alice.mutation(api.members.grantRole, {
        email: "alice@example.com",
        role: "admin",
      }),
    ).rejects.toThrow("permission");
  });
  it("normalizes transfer references and rejects impossible dates", async () => {
    const { alice } = await fixture();
    const base = {
      amountCents: 1000,
      fund: "general",
      giftDate: "2026-09-22",
      reference: "AbC-ref-1",
      requestId: "reference-request-123",
    };
    await alice.mutation(api.donations.reportZelle, base);
    await expect(
      alice.mutation(api.donations.reportZelle, {
        ...base,
        reference: "abc-ref-1",
        requestId: "reference-request-456",
      }),
    ).rejects.toThrow("already been reported");
    await expect(
      alice.mutation(api.donations.reportZelle, {
        ...base,
        reference: "new-ref",
        requestId: "new-request-123456",
        giftDate: "2026-02-31",
      }),
    ).rejects.toThrow("valid transfer date");
  });
  it("rejects anonymous access to private records", async () => {
    const { t } = await fixture();
    await expect(t.query(api.donations.mine, {})).rejects.toThrow("sign in");
    await expect(t.query(api.members.exportMine, {})).rejects.toThrow(
      "sign in",
    );
  });
  it("keeps applications pending and prevents self-approval", async () => {
    const { alice, admin, ids } = await fixture();
    const id = await alice.mutation(api.members.save, {
      name: "Alice",
      phone: "",
      city: "",
      language: "en",
      interests: [],
      consent: true,
    });
    expect((await alice.query(api.members.me, {}))?.profile?.status).toBe(
      "pending",
    );
    await expect(
      alice.mutation(api.members.setStatus, { id, status: "active" }),
    ).rejects.toThrow("permission");
    await admin.mutation(api.members.setStatus, { id, status: "active" });
    expect((await alice.query(api.members.me, {}))?.profile?.status).toBe(
      "active",
    );
  });
  it("isolates records and deduplicates Zelle reports", async () => {
    const { alice, bob, admin } = await fixture();
    const data = {
      amountCents: 5000,
      fund: "construction",
      giftDate: "2026-09-22",
      reference: "bank-abc",
      requestId: "request-1234567890",
    };
    const id = await alice.mutation(api.donations.reportZelle, data);
    expect(await alice.mutation(api.donations.reportZelle, data)).toBe(id);
    expect(await bob.query(api.donations.mine, {})).toHaveLength(0);
    expect((await alice.query(api.donations.mine, {}))[0].status).toBe(
      "reported",
    );
    await expect(
      alice.mutation(api.donations.reconcile, {
        id,
        confirmed: true,
        note: "self approval",
      }),
    ).rejects.toThrow("permission");
    await admin.mutation(api.donations.reconcile, {
      id,
      confirmed: true,
      note: "Verified against bank record",
    });
    expect((await alice.query(api.donations.mine, {}))[0].status).toBe(
      "confirmed",
    );
    await expect(
      admin.mutation(api.donations.reconcile, {
        id,
        confirmed: true,
        note: "duplicate",
      }),
    ).rejects.toThrow("unreviewed");
  });
  it("requires independent review of an administrator gift", async () => {
    const { admin } = await fixture();
    const id = await admin.mutation(api.donations.reportZelle, {
      amountCents: 1000,
      fund: "general",
      giftDate: "2026-09-22",
      reference: "admin-gift",
      requestId: "admin-request-123456",
    });
    await expect(
      admin.mutation(api.donations.reconcile, {
        id,
        confirmed: true,
        note: "verified",
      }),
    ).rejects.toThrow("Another administrator");
  });
  it("rejects invalid money and funds", () => {
    for (const amount of [0, -1, 1.5, NaN, Infinity, 10000001])
      expect(() => validateGift(amount, "general")).toThrow();
    expect(() => validateGift(100, "unknown")).toThrow();
    expect(() => validateGift(100, "general")).not.toThrow();
  });
});
describe("Tickets", () => {
  it("enforces capacity, owner cancellation and single admission", async () => {
    const { t, ids, alice, bob, admin } = await fixture();
    const ticket = await t.mutation(internal.events.reserve, {
      eventId: ids.event,
      userId: ids.alice,
      attendeeName: "Alice",
      token: "unique-ticket-token",
    });
    expect(
      await t.mutation(internal.events.reserve, {
        eventId: ids.event,
        userId: ids.alice,
        attendeeName: "Alice",
        token: "replacement-token",
      }),
    ).toBe(ticket);
    await expect(
      t.mutation(internal.events.reserve, {
        eventId: ids.event,
        userId: ids.bob,
        attendeeName: "Bob",
        token: "bob-token",
      }),
    ).rejects.toThrow("full");
    await expect(
      bob.mutation(api.events.cancel, { id: ticket }),
    ).rejects.toThrow("cannot");
    await expect(
      alice.mutation(api.events.checkIn, {
        eventId: ids.event,
        token: "unique-ticket-token",
      }),
    ).rejects.toThrow("permission");
    expect(
      (
        await admin.mutation(api.events.checkIn, {
          eventId: ids.event,
          token: "unique-ticket-token",
        })
      ).alreadyCheckedIn,
    ).toBe(false);
    expect(
      (
        await admin.mutation(api.events.checkIn, {
          eventId: ids.event,
          token: "unique-ticket-token",
        })
      ).alreadyCheckedIn,
    ).toBe(true);
    await expect(
      alice.mutation(api.events.cancel, { id: ticket }),
    ).rejects.toThrow("cannot");
  });
  it("releases capacity on cancellation and rejects the cancelled ticket", async () => {
    const { t, ids, alice, admin } = await fixture();
    const ticket = await t.mutation(internal.events.reserve, {
      eventId: ids.event,
      userId: ids.alice,
      attendeeName: "Alice",
      token: "cancel-token",
    });
    await alice.mutation(api.events.cancel, { id: ticket });
    await expect(
      admin.mutation(api.events.checkIn, {
        eventId: ids.event,
        token: "cancel-token",
      }),
    ).rejects.toThrow("cancelled");
    await expect(
      t.mutation(internal.events.reserve, {
        eventId: ids.event,
        userId: ids.bob,
        attendeeName: "Bob",
        token: "new-token",
      }),
    ).resolves.toBeTruthy();
  });
});
describe("Archive preservation", () => {
  it("separates public, active-member, and administrator records", async () => {
    const { t, alice, admin } = await fixture();
    const base = {
      title: "Private record",
      description: "Test",
      kind: "document" as const,
      date: "2026-09-22",
      language: "English",
      published: true,
      rights: "Permission verified",
    };
    await admin.mutation(api.archive.save, { ...base, visibility: "members" });
    await admin.mutation(api.archive.save, {
      ...base,
      title: "Office record",
      visibility: "admin",
    });
    expect(await alice.query(api.archive.list, {})).toHaveLength(0);
    const member = await alice.mutation(api.members.save, {
      name: "Alice",
      phone: "",
      city: "",
      language: "en",
      interests: [],
      consent: true,
    });
    await admin.mutation(api.members.setStatus, {
      id: member,
      status: "active",
    });
    expect(await alice.query(api.archive.list, {})).toHaveLength(1);
    expect(await admin.query(api.archive.list, {})).toHaveLength(2);
    expect(await t.query(api.archive.list, {})).toHaveLength(0);
  });
  it("does not return public file URLs for private uploads", async () => {
    const { t, ids, admin, alice } = await fixture();
    const storageId = await t.run((ctx) =>
      ctx.storage.store(
        new Blob(["private test document"], { type: "text/plain" }),
      ),
    );
    // convex-test's storeBlob adapter omits contentType metadata. Seed the record
    // here to test download authorization; live upload checks cover MIME validation.
    const id = await t.run((ctx) =>
      ctx.db.insert("archive", {
        title: "Protected upload",
        description: "Test",
        kind: "document",
        date: "2026-09-22",
        language: "English",
        published: true,
        rights: "Test permission",
        visibility: "admin",
        storageId,
        version: 1,
        updatedAt: Date.now(),
        createdBy: ids.admin,
      }),
    );
    const list = await admin.query(api.archive.list, {});
    expect(list[0].url).toBeUndefined();
    expect(list[0].protectedFile).toBe(true);
    await expect(
      alice.query(internal.archive.authorizedFile, { id }),
    ).rejects.toThrow();
    expect(
      (await admin.query(internal.archive.authorizedFile, { id })).storageId,
    ).toBe(storageId);
  });
  it("hides private items and preserves a version on edit", async () => {
    const { t, admin } = await fixture();
    const args = {
      title: "Test record",
      description: "Original description",
      kind: "document" as const,
      date: "2026-09-22",
      language: "English",
      visibility: "members" as const,
      published: true,
      url: "https://example.com/record.pdf",
      rights: "Permission recorded",
    };
    const id = await admin.mutation(api.archive.save, args);
    expect(await t.query(api.archive.list, {})).toHaveLength(0);
    await admin.mutation(api.archive.save, {
      ...args,
      id,
      title: "Updated record",
      visibility: "public",
    });
    expect((await t.query(api.archive.list, {}))[0].version).toBe(2);
    const revisions = await admin.query(api.archive.revisions, { id });
    expect(revisions).toHaveLength(1);
    expect(JSON.parse(revisions[0].snapshot).title).toBe("Test record");
  });
  it("rejects unsafe link schemes", async () => {
    const { admin } = await fixture();
    await expect(
      admin.mutation(api.archive.save, {
        title: "Bad link",
        description: "Bad",
        kind: "document",
        date: "2026-09-22",
        language: "English",
        visibility: "public",
        published: true,
        url: "javascript:alert(1)",
        rights: "Test",
      }),
    ).rejects.toThrow("HTTPS");
  });
});
describe("Stripe event accounting", () => {
  it("keeps ACH pending until paid and ignores duplicate events", async () => {
    const { t, ids, alice } = await fixture();
    const id = await t.mutation(internal.donations.beginCheckout, {
      userId: ids.alice,
      amountCents: 5000,
      fund: "construction",
      frequency: "once",
      requestId: "stripe-request-123456",
    });
    await t.mutation(internal.paymentRecords.apply, {
      eventId: "evt-pending",
      eventCreated: 100,
      payload: {
        type: "checkout.session.completed",
        kind: "checkout",
        id,
        sessionId: "cs_1",
        paymentIntentId: "pi_1",
        mode: "payment",
        paid: false,
      },
    });
    expect((await alice.query(api.donations.mine, {}))[0].status).toBe(
      "pending",
    );
    const paid = {
      eventId: "evt-paid",
      eventCreated: 101,
      payload: {
        type: "checkout.session.async_payment_succeeded",
        kind: "checkout",
        id,
        sessionId: "cs_1",
        paymentIntentId: "pi_1",
        mode: "payment",
        paid: true,
      },
    };
    await t.mutation(internal.paymentRecords.apply, paid);
    await t.mutation(internal.paymentRecords.apply, paid);
    expect((await alice.query(api.donations.mine, {}))[0].status).toBe(
      "confirmed",
    );
    expect(await alice.query(api.donations.mine, {})).toHaveLength(1);
    await t.mutation(internal.paymentRecords.apply, {
      eventId: "evt-stale",
      eventCreated: 99,
      payload: {
        ...paid.payload,
        paid: false,
        type: "checkout.session.completed",
      },
    });
    expect((await alice.query(api.donations.mine, {}))[0].status).toBe(
      "confirmed",
    );
  });
  it("tracks recurring invoices once each and preserves refund status", async () => {
    const { t, ids, alice } = await fixture();
    const id = await t.mutation(internal.donations.beginCheckout, {
      userId: ids.alice,
      amountCents: 2500,
      fund: "general",
      frequency: "monthly",
      requestId: "monthly-request-12345",
    });
    const initial = {
      type: "invoice.paid",
      kind: "invoice",
      id,
      userId: ids.alice,
      fund: "general",
      subscriptionId: "sub_1",
      invoiceId: "in_1",
      paymentIntentId: "pi_a",
      amountCents: 2500,
      initial: true,
    };
    await t.mutation(internal.paymentRecords.apply, {
      eventId: "evt-initial",
      eventCreated: 100,
      payload: initial,
    });
    await t.mutation(internal.paymentRecords.apply, {
      eventId: "evt-month2",
      eventCreated: 200,
      payload: {
        ...initial,
        invoiceId: "in_2",
        paymentIntentId: "pi_b",
        initial: false,
      },
    });
    expect(await alice.query(api.donations.mine, {})).toHaveLength(2);
    await t.mutation(internal.paymentRecords.apply, {
      eventId: "evt-refund",
      eventCreated: 210,
      payload: {
        type: "charge.refunded",
        kind: "reversal",
        paymentIntentId: "pi_b",
        refundedCents: 2500,
      },
    });
    await t.mutation(internal.paymentRecords.apply, {
      eventId: "evt-repeat-paid",
      eventCreated: 200,
      payload: {
        ...initial,
        invoiceId: "in_2",
        paymentIntentId: "pi_b",
        initial: false,
      },
    });
    expect(
      (await alice.query(api.donations.mine, {})).find(
        (d) => d.invoiceId === "in_2",
      )?.status,
    ).toBe("refunded");
  });
});
