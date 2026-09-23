import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireRole, roleFor, audit, clean } from "./security";
export function safeUrl(url: string) {
  if (url.includes("\\") || url.length > 2048)
    throw new Error("Use a valid HTTPS link.");
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  const u = new URL(url);
  if (u.protocol !== "https:") throw new Error("Use an HTTPS link.");
  return u.toString();
}
export const list = query({
  args: {},
  handler: async (ctx) => {
    const id = await getAuthUserId(ctx);
    const user = id ? await ctx.db.get(id) : null;
    const member = id
      ? await ctx.db
          .query("members")
          .withIndex("by_user", (q) => q.eq("userId", id))
          .unique()
      : null;
    const isAdmin = !!(
      id &&
      user?.emailVerificationTime &&
      (await roleFor(ctx, id)) === "admin"
    );
    const canReadMembers = !!(
      user?.emailVerificationTime &&
      (member?.status === "active" || isAdmin)
    );
    const rows = await ctx.db
      .query("archive")
      .withIndex("by_published", (q) => q.eq("published", true))
      .order("desc")
      .take(500);
    return Promise.all(
      rows
        .filter(
          (r) =>
            r.visibility === "public" ||
            (r.visibility === "members" && canReadMembers) ||
            isAdmin,
        )
        .map(async ({ createdBy, ...r }) => ({
          ...r,
          url: r.storageId
            ? r.visibility === "public"
              ? await ctx.storage.getUrl(r.storageId)
              : undefined
            : r.url,
          protectedFile: !!(r.storageId && r.visibility !== "public"),
        })),
    );
  },
});
export const authorizedFile = internalQuery({
  args: { id: v.id("archive") },
  handler: async (ctx, a) => {
    const record = await ctx.db.get(a.id);
    if (!record?.published || !record.storageId)
      throw new Error("File not available.");
    if (record.visibility !== "public") {
      const id = await getAuthUserId(ctx);
      const user = id ? await ctx.db.get(id) : null;
      const member = id
        ? await ctx.db
            .query("members")
            .withIndex("by_user", (q) => q.eq("userId", id))
            .unique()
        : null;
      if (
        !id ||
        !user?.emailVerificationTime ||
        (member?.status !== "active" && (await roleFor(ctx, id)) !== "admin")
      )
        throw new Error("Active membership required.");
      if (record.visibility === "admin" && (await roleFor(ctx, id)) !== "admin")
        throw new Error("Administrator access required.");
    }
    return { storageId: record.storageId, title: record.title };
  },
});
export const all = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    return ctx.db.query("archive").order("desc").take(500);
  },
});
export const uploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    return ctx.storage.generateUploadUrl();
  },
});
export const save = mutation({
  args: {
    id: v.optional(v.id("archive")),
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
  },
  handler: async (ctx, a) => {
    const u = await requireRole(ctx, ["admin"]);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(a.date) ||
      !Number.isFinite(Date.parse(a.date))
    )
      throw new Error("Use a valid YYYY-MM-DD date.");
    if (a.storageId) {
      const file = await ctx.db.system.get(a.storageId);
      if (
        !file ||
        file.size > 50 * 1024 * 1024 ||
        ![
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/webp",
          "audio/mpeg",
          "audio/mp4",
          "audio/wav",
          "text/plain",
        ].includes(file.contentType || "")
      )
        throw new Error(
          "Upload a PDF, image, audio file, or plain text file up to 50 MB.",
        );
    }
    const { id, ...rest } = a;
    const previous = id ? await ctx.db.get(id) : null;
    if (id && !previous) throw new Error("Archive item not found.");
    const data = {
      ...rest,
      title: clean(a.title, 180, "Title"),
      description: clean(a.description, 5000, "Description"),
      language: clean(a.language, 40, "Language"),
      rights: clean(a.rights, 500, "Rights and source"),
      url: a.url ? safeUrl(a.url) : undefined,
      version: (previous?.version || 0) + 1,
      updatedAt: Date.now(),
      createdBy: previous?.createdBy || u._id,
    };
    if (previous) {
      await ctx.db.insert("archiveRevisions", {
        archiveId: previous._id,
        snapshot: JSON.stringify(previous),
        actor: u._id,
        createdAt: Date.now(),
      });
      await ctx.db.patch(previous._id, data);
    }
    const result = id || (await ctx.db.insert("archive", data));
    await audit(
      ctx,
      u._id,
      "archive.saved",
      result,
      `version ${data.version}; ${data.visibility}; published=${data.published}`,
    );
    return result;
  },
});
export const revisions = query({
  args: { id: v.id("archive") },
  handler: async (ctx, a) => {
    await requireRole(ctx, ["admin"]);
    return ctx.db
      .query("archiveRevisions")
      .withIndex("by_archive", (q) => q.eq("archiveId", a.id))
      .order("desc")
      .take(100);
  },
});
