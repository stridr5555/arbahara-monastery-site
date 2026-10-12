import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  bankConnections: defineTable({
    owner: v.id("users"),
    institution: v.string(),
    status: v.union(
      v.literal("connected"),
      v.literal("reconnect"),
      v.literal("disconnected"),
    ),
    encryptedToken: v.optional(v.string()),
    cursor: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_status", ["status"]),
  bankTransactions: defineTable({
    connectionId: v.id("bankConnections"),
    providerId: v.string(),
    accountId: v.string(),
    date: v.string(),
    name: v.string(),
    amountCents: v.number(),
    pending: v.boolean(),
    removed: v.boolean(),
    matchedJournalId: v.optional(v.id("journals")),
    matchedBy: v.optional(v.id("users")),
    matchedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_provider", ["connectionId", "providerId"])
    .index("by_connection_date", ["connectionId", "date"])
    .index("by_journal", ["matchedJournalId"]),
  calendarConnections: defineTable({
    userId: v.id("users"),
    status: v.union(
      v.literal("connecting"),
      v.literal("connected"),
      v.literal("reconnect"),
      v.literal("disconnected"),
    ),
    nonce: v.optional(v.string()),
    encryptedRefreshToken: v.optional(v.string()),
    scope: v.optional(v.string()),
    consentedAt: v.optional(v.number()),
    lastSyncedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),
  calendarOAuthStates: defineTable({
    stateHash: v.string(),
    userId: v.id("users"),
    encryptedVerifier: v.string(),
    expiresAt: v.number(),
  }).index("by_hash", ["stateHash"]),
  calendarChanges: defineTable({
    eventId: v.string(),
    originalDate: v.string(),
    cancelled: v.boolean(),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    location: v.optional(v.string()),
    note: v.string(),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }).index("by_event", ["eventId"]),
  members: defineTable({
    userId: v.id("users"),
    name: v.string(),
    phone: v.string(),
    city: v.string(),
    language: v.union(v.literal("en"), v.literal("am")),
    interests: v.array(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("inactive"),
    ),
    consentAt: v.number(),
    updatedAt: v.number(),
    memberNumber: v.string(),
    baptismalName: v.optional(v.string()),
    spouseName: v.optional(v.string()),
    spouseBaptismalName: v.optional(v.string()),
    address: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),
  roles: defineTable({
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("treasurer"),
      v.literal("secretary"),
      v.literal("checkin"),
    ),
    grantedBy: v.optional(v.id("users")),
  }).index("by_user", ["userId"]),
  staffInvitations: defineTable({
    email: v.string(),
    role: v.union(
      v.literal("secretary"),
      v.literal("treasurer"),
      v.literal("checkin"),
    ),
    invitedBy: v.id("users"),
    createdAt: v.number(),
    revokedAt: v.optional(v.number()),
  }).index("by_email", ["email"]),
  households: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    address: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("inactive"),
    ),
    exempt: v.boolean(),
    approvedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
    duesStart: v.optional(v.string()),
    source: v.string(),
    sourceRow: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_source_row", ["source", "sourceRow"]),
  householdLinks: defineTable({
    householdId: v.id("households"),
    userId: v.id("users"),
    linkedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_household", ["householdId"]),
  duesCharges: defineTable({
    householdId: v.id("households"),
    month: v.string(),
    amountCents: v.number(),
    journalId: v.id("journals"),
    createdAt: v.number(),
  }).index("by_household_month", ["householdId", "month"]),
  receipts: defineTable({
    householdId: v.optional(v.id("households")),
    date: v.string(),
    amountCents: v.number(),
    duesCents: v.number(),
    giftCents: v.number(),
    method: v.union(
      v.literal("cash"),
      v.literal("zelle"),
      v.literal("ach"),
      v.literal("check"),
      v.literal("card"),
      v.literal("other"),
    ),
    reference: v.string(),
    requestId: v.string(),
    journalId: v.id("journals"),
    createdBy: v.id("users"),
    createdAt: v.number(),
    reversedBy: v.optional(v.id("journals")),
    source: v.optional(v.string()),
    intent: v.optional(v.string()),
  })
    .index("by_household", ["householdId"])
    .index("by_request", ["requestId"])
    .index("by_reference", ["reference"]),
  duesAllocations: defineTable({
    receiptId: v.id("receipts"),
    chargeId: v.id("duesCharges"),
    amountCents: v.number(),
    journalId: v.id("journals"),
    createdBy: v.id("users"),
    createdAt: v.number(),
    reversedAt: v.optional(v.number()),
  })
    .index("by_charge", ["chargeId"])
    .index("by_receipt", ["receiptId"]),
  journals: defineTable({
    date: v.string(),
    description: v.string(),
    reference: v.string(),
    requestId: v.string(),
    lines: v.array(
      v.object({
        account: v.string(),
        fund: v.string(),
        debitCents: v.number(),
        creditCents: v.number(),
      }),
    ),
    createdBy: v.id("users"),
    createdAt: v.number(),
    reversalOf: v.optional(v.id("journals")),
    reversedBy: v.optional(v.id("journals")),
  })
    .index("by_date", ["date"])
    .index("by_request", ["requestId"]),
  accountingPeriods: defineTable({
    month: v.string(),
    closedBy: v.id("users"),
    closedAt: v.number(),
  }).index("by_month", ["month"]),
  importBatches: defineTable({
    fingerprint: v.string(),
    fileName: v.string(),
    sheetName: v.string(),
    rows: v.array(
      v.object({
        row: v.number(),
        name: v.string(),
        email: v.string(),
        phone: v.string(),
        address: v.string(),
        exempt: v.boolean(),
      }),
    ),
    status: v.union(
      v.literal("staged"),
      v.literal("committed"),
      v.literal("reversed"),
    ),
    createdBy: v.id("users"),
    createdAt: v.number(),
    committedAt: v.optional(v.number()),
  }).index("by_fingerprint", ["fingerprint"]),
  donations: defineTable({
    userId: v.id("users"),
    amountCents: v.number(),
    fund: v.string(),
    // Keep historical ACH entries; all NEW Stripe checkouts are card-only.
    method: v.union(v.literal("ach"), v.literal("card"), v.literal("zelle")),
    frequency: v.union(v.literal("once"), v.literal("monthly")),
    status: v.union(
      v.literal("reported"),
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("failed"),
      v.literal("refunded"),
      v.literal("disputed"),
      v.literal("rejected"),
    ),
    reference: v.optional(v.string()),
    giftDate: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    stripeSessionId: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    invoiceId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    reviewNote: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    requestId: v.string(),
    refundedCents: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_session", ["stripeSessionId"])
    .index("by_payment", ["paymentIntentId"])
    .index("by_invoice", ["invoiceId"])
    .index("by_request", ["userId", "requestId"])
    .index("by_reference", ["reference"]),
  customers: defineTable({
    userId: v.id("users"),
    stripeCustomerId: v.string(),
  }).index("by_user", ["userId"]),
  subscriptions: defineTable({
    userId: v.id("users"),
    stripeSubscriptionId: v.string(),
    status: v.string(),
    amountCents: v.number(),
    fund: v.string(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe", ["stripeSubscriptionId"]),
  events: defineTable({
    title: v.string(),
    description: v.string(),
    location: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    capacity: v.number(),
    published: v.boolean(),
    cancelled: v.boolean(),
    createdBy: v.id("users"),
    updatedAt: v.number(),
  }).index("by_published", ["published", "startsAt"]),
  tickets: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    token: v.string(),
    attendeeName: v.string(),
    status: v.union(
      v.literal("reserved"),
      v.literal("checked_in"),
      v.literal("cancelled"),
    ),
    createdAt: v.number(),
    checkedInAt: v.optional(v.number()),
    checkedInBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_token", ["token"])
    .index("by_event_user", ["eventId", "userId"]),
  archive: defineTable({
    title: v.string(),
    description: v.string(),
    kind: v.union(
      v.literal("document"),
      v.literal("recording"),
      v.literal("photograph"),
      v.literal("announcement"),
    ),
    date: v.string(),
    language: v.string(),
    visibility: v.union(
      v.literal("public"),
      v.literal("members"),
      v.literal("admin"),
    ),
    published: v.boolean(),
    url: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    rights: v.string(),
    version: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
  }).index("by_published", ["published", "date"]),
  archiveRevisions: defineTable({
    archiveId: v.id("archive"),
    snapshot: v.string(),
    actor: v.id("users"),
    createdAt: v.number(),
  }).index("by_archive", ["archiveId"]),
  audit: defineTable({
    actor: v.optional(v.id("users")),
    action: v.string(),
    target: v.string(),
    details: v.string(),
    createdAt: v.number(),
  }).index("by_time", ["createdAt"]),
  webhookEvents: defineTable({
    stripeEventId: v.string(),
    type: v.string(),
    createdAt: v.number(),
  }).index("by_stripe", ["stripeEventId"]),
  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
  }).index("by_key", ["key"]),
});
