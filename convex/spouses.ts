import {
  query,
  mutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { requireUser, requireRole, audit, rateLimit, clean } from "./security";
import {
  familyContact,
  FAMILY_CONSENT,
  FAMILY_CONSENT_VERSION,
} from "../src/lib/familyContact";
import { FINANCE_ROLES, postJournal } from "./finance";
import { approvalStart, reverseLines } from "./ledger";
const identity = async (ctx: QueryCtx | MutationCtx, id: Id<"users">) => {
  const user = await ctx.db.get(id);
  const profile = await ctx.db
    .query("members")
    .withIndex("by_user", (q) => q.eq("userId", id))
    .unique();
  const link = await ctx.db
    .query("householdLinks")
    .withIndex("by_user", (q) => q.eq("userId", id))
    .unique();
  const household = link ? await ctx.db.get(link.householdId) : null;
  if (
    !user?.emailVerificationTime ||
    !profile ||
    !link ||
    !household ||
    household.status === "inactive"
  )
    throw new ConvexError(
      "Both spouses need a verified sign-in and a current household profile. Ask the office for help with an existing roster record.",
    );
  return { user, profile, link, household };
};
async function relationships(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const [sent, received] = await Promise.all([
    ctx.db
      .query("spouseConnections")
      .withIndex("by_sender", (q) => q.eq("senderId", userId))
      .collect(),
    ctx.db
      .query("spouseConnections")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .collect(),
  ]);
  return [...sent, ...received];
}
async function assertAvailable(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  ignore?: Id<"spouseConnections">,
) {
  if (
    (await relationships(ctx, userId)).some(
      (r) =>
        r._id !== ignore && ["linked", "household_review"].includes(r.status),
    )
  )
    throw new ConvexError(
      "A spouse connection already exists or is awaiting household review. Contact the office before creating another.",
    );
}
async function safeSource(
  ctx: QueryCtx | MutationCtx,
  source: Doc<"households">,
  userId: Id<"users">,
) {
  const [links, charge, receipt, bankRequest] = await Promise.all([
    ctx.db
      .query("householdLinks")
      .withIndex("by_household", (q) => q.eq("householdId", source._id))
      .collect(),
    ctx.db
      .query("duesCharges")
      .withIndex("by_household_month", (q) => q.eq("householdId", source._id))
      .first(),
    ctx.db
      .query("receipts")
      .withIndex("by_household", (q) => q.eq("householdId", source._id))
      .first(),
    ctx.db
      .query("achRequests")
      .withIndex("by_household", (q) => q.eq("householdId", source._id))
      .first(),
  ]);
  return (
    source.source === "application" &&
    source.status === "pending" &&
    !source.approvedAt &&
    !charge &&
    !receipt &&
    !bankRequest &&
    links.length === 1 &&
    links[0].userId === userId
  );
}
async function connect(
  ctx: MutationCtx,
  row: Doc<"spouseConnections">,
  actor: Id<"users">,
) {
  if (!row.recipientId || !row.recipientConsentedAt)
    throw new ConvexError("Both spouses must confirm household sharing first.");
  const a = await identity(ctx, row.senderId),
    b = await identity(ctx, row.recipientId);
  await assertAvailable(ctx, row.senderId, row._id);
  await assertAvailable(ctx, row.recipientId, row._id);
  if (a.household._id !== row.senderHouseholdId)
    throw new ConvexError(
      "The requesting household changed. Cancel this request and create a new one.",
    );
  let destination = a,
    source = b;
  // Prefer the already-approved family when only one side has an approved account.
  if (b.household.status === "active" && a.household.status !== "active") {
    destination = b;
    source = a;
  }
  if (a.household._id !== b.household._id) {
    const destinationLinks = await ctx.db
      .query("householdLinks")
      .withIndex("by_household", (q) =>
        q.eq("householdId", destination.household._id),
      )
      .collect();
    if (
      !(await safeSource(ctx, source.household, source.user._id)) ||
      destinationLinks.length !== 1
    ) {
      await ctx.db.patch(row._id, {
        status: "household_review",
        updatedAt: Date.now(),
        reviewReason:
          "Separate approved households, other linked accounts, financial history or bank setup needs accountant review. No payments or authorizations were moved.",
      });
      await audit(
        ctx,
        actor,
        "spouse.household-review-required",
        row._id,
        "Both spouses confirmed; existing records preserved. No new charge or bank instruction.",
      );
      return "household_review" as const;
    }
    await ctx.db.patch(source.household._id, {
      status: "inactive",
      updatedAt: Date.now(),
    });
    await ctx.db.patch(source.link._id, {
      householdId: destination.household._id,
      linkedBy: actor,
    });
    if (destination.household.status === "active")
      await ctx.db.patch(source.profile._id, {
        status: "active",
        updatedAt: Date.now(),
      });
    await audit(
      ctx,
      actor,
      "spouse.empty-application-consolidated",
      source.household._id,
      `Retained original application; accounts share household ${destination.household._id}. No financial history moved.`,
    );
  }
  await ctx.db.patch(row._id, {
    status: "linked",
    householdId: destination.household._id,
    reviewReason: undefined,
    updatedAt: Date.now(),
  });
  await audit(
    ctx,
    actor,
    "spouse.connected",
    row._id,
    "Mutual household sharing confirmed. One $20 monthly family obligation; no second assessment created. Personal giving and bank details remain separate.",
  );
  return "linked" as const;
}
export const request = mutation({
  args: {
    kind: v.union(v.literal("email"), v.literal("phone")),
    contact: v.string(),
    consent: v.boolean(),
  },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx),
      me = await identity(ctx, user._id);
    if (!a.consent)
      throw new ConvexError(
        "Confirm the spouse relationship and household-sharing notice before sending a request.",
      );
    await rateLimit(ctx, `spouse-request:${user._id}`, 5, 86400000);
    await assertAvailable(ctx, user._id);
    let contact: string;
    try {
      contact = familyContact(a.kind, a.contact);
    } catch (e) {
      throw new ConvexError((e as Error).message);
    }
    if (a.kind === "email" && contact === user.email!.toLowerCase())
      throw new ConvexError("Enter your spouse’s contact, not your own.");
    if (a.kind === "phone") {
      try {
        if (familyContact("phone", me.profile.phone) === contact)
          throw new ConvexError("Enter your spouse’s contact, not your own.");
      } catch (e) {
        if (e instanceof ConvexError) throw e;
      }
    }
    const old = (await relationships(ctx, user._id)).find(
      (r) =>
        r.senderId === user._id &&
        r.contactKey === `${a.kind}:${contact}` &&
        ["pending", "phone_review"].includes(r.status) &&
        r.expiresAt > Date.now(),
    );
    if (old) return old._id;
    const now = Date.now();
    const id = await ctx.db.insert("spouseConnections", {
      senderId: user._id,
      senderHouseholdId: me.household._id,
      contactKind: a.kind,
      contact,
      contactKey: `${a.kind}:${contact}`,
      status: a.kind === "phone" ? "phone_review" : "pending",
      senderConsentedAt: now,
      consentVersion: FAMILY_CONSENT_VERSION,
      consentText: FAMILY_CONSENT,
      expiresAt: now + 14 * 86400000,
      updatedAt: now,
    });
    await audit(
      ctx,
      user._id,
      "spouse.requested",
      id,
      "Private in-app request only; no email/SMS sent and no directory lookup disclosed.",
    );
    return id;
  },
});
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const owned = await relationships(ctx, user._id);
    const incoming = await ctx.db
      .query("spouseConnections")
      .withIndex("by_contact", (q) =>
        q
          .eq("contactKey", `email:${user.email!.toLowerCase()}`)
          .eq("status", "pending"),
      )
      .collect();
    const rows = [
      ...new Map([...owned, ...incoming].map((r) => [r._id, r])).values(),
    ];
    return Promise.all(
      rows
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 50)
        .map(async (r) => {
          const isSender = r.senderId === user._id;
          const peerId = isSender
            ? r.recipientConsentedAt
              ? r.recipientId
              : undefined
            : r.senderId;
          const peer = peerId
            ? await ctx.db
                .query("members")
                .withIndex("by_user", (q) => q.eq("userId", peerId))
                .unique()
            : null;
          return {
            id: r._id,
            status: r.status,
            incoming: !isSender,
            peerName: peer?.name,
            contact: isSender ? r.contact : undefined,
            contactKind: r.contactKind,
            expiresAt: r.expiresAt,
            householdId: r.householdId,
            effectiveMonth: r.effectiveMonth,
            reviewReason: r.reviewReason,
          };
        }),
    );
  },
});
export const respond = mutation({
  args: {
    id: v.id("spouseConnections"),
    accept: v.boolean(),
    consent: v.boolean(),
  },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx),
      row = await ctx.db.get(a.id);
    if (
      !row ||
      row.senderId === user._id ||
      row.status !== "pending" ||
      row.expiresAt < Date.now() ||
      (row.recipientId
        ? row.recipientId !== user._id
        : row.contactKind !== "email" ||
          row.contact !== user.email!.toLowerCase())
    )
      throw new ConvexError(
        "This request is unavailable or expired. Ask your spouse to send a new request.",
      );
    if (!a.accept) {
      await ctx.db.patch(row._id, {
        status: "declined",
        recipientId: user._id,
        updatedAt: Date.now(),
      });
      await audit(ctx, user._id, "spouse.declined", row._id);
      return "declined" as const;
    }
    if (!a.consent)
      throw new ConvexError(
        "Confirm the spouse relationship and household sharing before accepting.",
      );
    await identity(ctx, user._id);
    await assertAvailable(ctx, user._id, row._id);
    await ctx.db.patch(row._id, {
      recipientId: user._id,
      recipientConsentedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return connect(ctx, (await ctx.db.get(row._id))!, user._id);
  },
});
export const cancel = mutation({
  args: { id: v.id("spouseConnections") },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx),
      r = await ctx.db.get(a.id);
    if (
      !r ||
      !(
        r.senderId === user._id ||
        (r.recipientId === user._id && r.status === "household_review")
      ) ||
      !["pending", "phone_review", "household_review"].includes(r.status)
    )
      throw new ConvexError(
        "Only an unanswered request or a connection awaiting office review can be cancelled here. Contact the office about a linked household.",
      );
    await ctx.db.patch(r._id, { status: "cancelled", updatedAt: Date.now() });
    await audit(ctx, user._id, "spouse.cancelled", r._id);
  },
});
export const officeQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, FINANCE_ROLES);
    const groups = await Promise.all(
      ["phone_review", "household_review"].map((status) =>
        ctx.db
          .query("spouseConnections")
          .withIndex("by_status", (q) =>
            q.eq("status", status as "phone_review" | "household_review"),
          )
          .order("desc")
          .take(51),
      ),
    );
    const rows = groups.flatMap((g) => g.slice(0, 50));
    return {
      truncated: groups.some((g) => g.length > 50),
      rows: await Promise.all(
        rows.map(async (r) => {
          const sender = await ctx.db
            .query("members")
            .withIndex("by_user", (q) => q.eq("userId", r.senderId))
            .unique();
          const recipient = r.recipientId
            ? await ctx.db
                .query("members")
                .withIndex("by_user", (q) => q.eq("userId", r.recipientId!))
                .unique()
            : null;
          return {
            id: r._id,
            status: r.status,
            senderName: sender?.name || "Member profile unavailable",
            recipientName: recipient?.name,
            contact: r.contact,
            contactKind: r.contactKind,
            expiresAt: r.expiresAt,
            reviewReason: r.reviewReason,
          };
        }),
      ),
    };
  },
});
export const verifyPhone = mutation({
  args: {
    id: v.id("spouseConnections"),
    recipientEmail: v.string(),
    verified: v.boolean(),
    reference: v.string(),
  },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, ["admin", "secretary"]),
      row = await ctx.db.get(a.id);
    if (
      !row ||
      row.status !== "phone_review" ||
      row.expiresAt < Date.now() ||
      !a.verified
    )
      throw new ConvexError(
        "Confirm the spouse’s identity and phone ownership before forwarding a current phone request.",
      );
    let email: string;
    try {
      email = familyContact("email", a.recipientEmail);
    } catch {
      throw new ConvexError("Enter the spouse’s verified sign-in email.");
    }
    const matches = (
      await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .collect()
    ).filter((u) => u.emailVerificationTime);
    if (matches.length !== 1 || matches[0]._id === row.senderId)
      throw new ConvexError(
        "Choose the spouse’s own verified account. Do not select the requesting member.",
      );
    await identity(ctx, matches[0]._id);
    const reference = clean(
      a.reference,
      200,
      "Identity verification reference",
    );
    await ctx.db.patch(row._id, {
      status: "pending",
      recipientId: matches[0]._id,
      officeVerifiedBy: actor._id,
      officeReference: reference,
      updatedAt: Date.now(),
    });
    await audit(
      ctx,
      actor._id,
      "spouse.phone-verified",
      row._id,
      "Phone owner matched by office; recipient must still confirm household sharing in their own verified account.",
    );
  },
});
export const retryConsolidation = mutation({
  args: { id: v.id("spouseConnections"), reviewed: v.boolean() },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, ["admin", "secretary"]),
      row = await ctx.db.get(a.id);
    if (!a.reviewed || !row || row.status !== "household_review")
      throw new ConvexError(
        "Review the existing household records before retrying consolidation.",
      );
    return connect(ctx, row, actor._id);
  },
});
export const finalizeReviewed = mutation({
  args: {
    id: v.id("spouseConnections"),
    primary: v.union(v.literal("sender"), v.literal("recipient")),
    reviewed: v.boolean(),
    reference: v.string(),
  },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, ["admin", "secretary"]),
      row = await ctx.db.get(a.id);
    if (
      !row ||
      row.status !== "household_review" ||
      !row.recipientId ||
      !row.recipientConsentedAt ||
      !a.reviewed
    )
      throw new ConvexError(
        "Both spouses must consent and the office must review the financial and bank records first.",
      );
    const left = await identity(ctx, row.senderId),
      right = await identity(ctx, row.recipientId);
    if (left.household._id !== row.senderHouseholdId)
      throw new ConvexError(
        "The requesting household changed. Cancel this request and create a new one.",
      );
    await assertAvailable(ctx, row.senderId, row._id);
    await assertAvailable(ctx, row.recipientId, row._id);
    const destination = a.primary === "sender" ? left : right,
      source = a.primary === "sender" ? right : left;
    if (left.household._id === right.household._id)
      return connect(ctx, row, actor._id);
    if (destination.household.status !== "active")
      throw new ConvexError("Choose an approved primary family household.");
    const reference = clean(a.reference, 150, "Accountant review reference");
    for (const h of [source.household, destination.household]) {
      const links = await ctx.db
        .query("householdLinks")
        .withIndex("by_household", (q) => q.eq("householdId", h._id))
        .collect();
      if (links.length !== 1)
        throw new ConvexError(
          "Other accounts are linked to one of these households. An administrator must review their sharing permissions separately.",
        );
    }
    const bankRequests = await ctx.db
      .query("achRequests")
      .withIndex("by_household", (q) =>
        q.eq("householdId", source.household._id),
      )
      .collect();
    if (bankRequests.some((r) => r.status !== "withdrawn"))
      throw new ConvexError(
        "Resolve and withdraw the secondary household’s bank setup request first. Cancel any actual Chase instructions separately before consolidation.",
      );
    const charges = await ctx.db
      .query("duesCharges")
      .withIndex("by_household_month", (q) =>
        q.eq("householdId", source.household._id),
      )
      .collect();
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_household", (q) =>
        q.eq("householdId", source.household._id),
      )
      .collect();
    const effectiveMonth = approvalStart(Date.now());
    for (const receipt of receipts.filter(
      (r) => !r.reversedBy && r.duesCents > 0,
    )) {
      const allocations = await ctx.db
        .query("duesAllocations")
        .withIndex("by_receipt", (q) => q.eq("receiptId", receipt._id))
        .collect();
      if (
        receipt.duesCents >
        allocations
          .filter((x) => !x.reversedAt)
          .reduce((s, x) => s + x.amountCents, 0)
      )
        throw new ConvexError(
          "The secondary household has unapplied dues credit. The accountant must resolve that credit before consolidation; it will not be discarded or moved automatically.",
        );
    }
    for (const c of charges.filter((c) => !c.cancelledBy)) {
      const allocations = await ctx.db
        .query("duesAllocations")
        .withIndex("by_charge", (q) => q.eq("chargeId", c._id))
        .collect();
      const paid = allocations
        .filter((x) => !x.reversedAt)
        .reduce((s, x) => s + x.amountCents, 0);
      if (c.month < effectiveMonth && paid < c.amountCents)
        throw new ConvexError(
          "The secondary household has historical unpaid dues. The accountant must review that balance before consolidation; historical obligations are not erased automatically.",
        );
      if (c.month >= effectiveMonth && paid > 0)
        throw new ConvexError(
          "The secondary household has prepaid future dues. The accountant must resolve prepaid coverage before consolidation; no refund, gift conversion or credit transfer is automatic.",
        );
    }
    for (const c of charges.filter(
      (c) => !c.cancelledBy && c.month >= effectiveMonth,
    )) {
      const original = await ctx.db.get(c.journalId);
      if (!original || original.reversedBy)
        throw new ConvexError(
          "A secondary dues assessment was already adjusted. The accountant must review its charge and journal records together.",
        );
      const undo = await postJournal(
        ctx,
        actor._id,
        original.date,
        "Cancel duplicate future family assessment",
        reference,
        `spouse-dues:${row._id}:${c._id}`,
        reverseLines(original.lines),
        original._id,
      );
      await ctx.db.patch(original._id, { reversedBy: undo });
      await ctx.db.patch(c._id, { cancelledBy: undo });
    }
    await ctx.db.insert("formerHouseholdLinks", {
      userId: source.user._id,
      householdId: source.household._id,
      connectionId: row._id,
      createdAt: Date.now(),
    });
    await ctx.db.patch(source.household._id, {
      status: "inactive",
      updatedAt: Date.now(),
    });
    await ctx.db.patch(source.link._id, {
      householdId: destination.household._id,
      linkedBy: actor._id,
    });
    await ctx.db.patch(source.profile._id, {
      status: "active",
      updatedAt: Date.now(),
    });
    await ctx.db.patch(row._id, {
      status: "linked",
      householdId: destination.household._id,
      effectiveMonth,
      officeReference: reference,
      reviewReason: undefined,
      updatedAt: Date.now(),
    });
    await audit(
      ctx,
      actor._id,
      "spouse.reviewed-households-consolidated",
      row._id,
      `One family obligation from ${effectiveMonth}; unpaid future duplicate assessments reversed with original records retained. Historical collections not moved. Review: ${reference}`,
    );
    return "linked" as const;
  },
});
export const history = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const links = await ctx.db
      .query("formerHouseholdLinks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return Promise.all(
      links.map(async (link) => ({
        name: (await ctx.db.get(link.householdId))?.name,
        householdId: link.householdId,
        receipts: (
          await ctx.db
            .query("receipts")
            .withIndex("by_household", (q) =>
              q.eq("householdId", link.householdId),
            )
            .collect()
        ).map(({ createdBy, requestId, intent, ...r }) => r),
        charges: await ctx.db
          .query("duesCharges")
          .withIndex("by_household_month", (q) =>
            q.eq("householdId", link.householdId),
          )
          .collect(),
      })),
    );
  },
});
