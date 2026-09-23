import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
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
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),
  roles: defineTable({
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("treasurer"),
      v.literal("checkin"),
    ),
    grantedBy: v.optional(v.id("users")),
  }).index("by_user", ["userId"]),
  donations: defineTable({
    userId: v.id("users"),
    amountCents: v.number(),
    fund: v.string(),
    method: v.union(v.literal("ach"), v.literal("zelle")),
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
