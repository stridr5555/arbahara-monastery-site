import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { audit, clean, requireRole } from "./security";
import { FINANCE_ROLES } from "./finance";
const row = v.object({
  row: v.number(),
  name: v.string(),
  email: v.string(),
  phone: v.string(),
  address: v.string(),
  exempt: v.boolean(),
});
export const batches = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, FINANCE_ROLES);
    return (await ctx.db.query("importBatches").order("desc").take(30)).map(
      ({ rows, ...batch }) => ({ ...batch, rowCount: rows.length }),
    );
  },
});
export const stage = mutation({
  args: {
    fileName: v.string(),
    sheetName: v.string(),
    fingerprint: v.string(),
    rows: v.array(row),
  },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, FINANCE_ROLES);
    clean(a.fileName, 200, "File name");
    clean(a.sheetName, 100, "Sheet name");
    if (!/^[a-f0-9]{64}$/.test(a.fingerprint))
      throw new Error("Invalid import fingerprint.");
    if (!a.rows.length || a.rows.length > 300)
      throw new Error("Stage 1–300 roster rows at a time.");
    const seen = new Set<string>();
    for (const r of a.rows) {
      clean(r.name, 120, "Household name");
      if (
        !Number.isSafeInteger(r.row) ||
        r.row < 1 ||
        r.email.length > 200 ||
        r.phone.length > 40 ||
        r.address.length > 500
      )
        throw new Error("Invalid import row.");
      if (r.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email))
        throw new Error(`Invalid email on source row ${r.row}.`);
      const keys = [
        `name:${r.name.trim().toLowerCase()}`,
        ...(r.email ? [`email:${r.email.trim().toLowerCase()}`] : []),
        ...(r.phone.replace(/\D/g, "").length >= 10
          ? [`phone:${r.phone.replace(/\D/g, "")}`]
          : []),
      ];
      if (keys.some((key) => seen.has(key)))
        throw new Error(
          `Duplicate household name or contact on source row ${r.row}; review before staging.`,
        );
      keys.forEach((key) => seen.add(key));
    }
    const old = await ctx.db
      .query("importBatches")
      .withIndex("by_fingerprint", (q) => q.eq("fingerprint", a.fingerprint))
      .unique();
    if (old)
      throw new Error(
        `This file and sheet were already ${old.status}. Use the existing batch, not a duplicate.`,
      );
    const id = await ctx.db.insert("importBatches", {
      ...a,
      status: "staged",
      createdBy: actor._id,
      createdAt: Date.now(),
    });
    await audit(
      ctx,
      actor._id,
      "roster-import.staged",
      id,
      `${a.fileName} / ${a.sheetName}: ${a.rows.length} rows`,
    );
    return id;
  },
});
export const commit = mutation({
  args: { id: v.id("importBatches"), confirmed: v.boolean() },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, ["admin", "secretary"]),
      batch = await ctx.db.get(a.id);
    if (!batch || batch.status !== "staged")
      throw new Error("Only a staged batch can be committed.");
    if (!a.confirmed)
      throw new Error("Confirm the roster preview has been reviewed.");
    const existing = await ctx.db.query("households").collect();
    for (const r of batch.rows) {
      const matches = existing.filter(
        (h) =>
          h.name.trim().toLowerCase() === r.name.trim().toLowerCase() ||
          (r.email && h.email?.toLowerCase() === r.email.toLowerCase()) ||
          (r.phone.replace(/\D/g, "").length >= 10 &&
            h.phone.replace(/\D/g, "") === r.phone.replace(/\D/g, "")),
      );
      if (matches.length)
        throw new Error(
          `Source row ${r.row} may already exist. Review duplicates before committing; nothing has been imported.`,
        );
    }
    for (const r of batch.rows)
      await ctx.db.insert("households", {
        name: r.name.trim(),
        email: r.email.trim().toLowerCase() || undefined,
        phone: r.phone.trim(),
        address: r.address.trim(),
        status: "pending",
        exempt: r.exempt,
        source: `import:${batch._id}`,
        sourceRow: `${batch.fileName} / ${batch.sheetName} / row ${r.row}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    await ctx.db.patch(batch._id, {
      status: "committed",
      committedAt: Date.now(),
    });
    await audit(
      ctx,
      actor._id,
      "roster-import.committed",
      batch._id,
      "Pending households only; no accounts, historical charges or receipts created.",
    );
  },
});
export const recover = mutation({
  args: { id: v.id("importBatches"), reason: v.string() },
  handler: async (ctx, a) => {
    const actor = await requireRole(ctx, ["admin"]),
      batch = await ctx.db.get(a.id);
    if (!batch || batch.status === "reversed")
      throw new Error("Batch missing or already recovered.");
    const reason = clean(a.reason, 400, "Recovery reason");
    const households = await ctx.db
      .query("households")
      .withIndex("by_source_row", (q) => q.eq("source", `import:${batch._id}`))
      .collect();
    if (households.some((h) => h.approvedAt))
      throw new Error(
        "This batch contains approved households. An accountant must review linked charges and receipts before recovery.",
      );
    for (const h of households)
      await ctx.db.patch(h._id, { status: "inactive", updatedAt: Date.now() });
    await ctx.db.patch(batch._id, { status: "reversed" });
    await audit(ctx, actor._id, "roster-import.recovered", batch._id, reason);
  },
});
