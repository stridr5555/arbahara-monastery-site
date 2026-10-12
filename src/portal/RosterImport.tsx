import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ErrorMessage, message } from "../components/Live";
import { downloadCsv, readSpreadsheet } from "../lib/spreadsheet";
type Sheet = { name: string; rows: string[][] };
export function RosterImport({ role }: { role: string }) {
  const batches = useQuery(api.imports.batches),
    stage = useMutation(api.imports.stage),
    commit = useMutation(api.imports.commit),
    recover = useMutation(api.imports.recover);
  const [sheets, setSheets] = useState<Sheet[]>([]),
    [sheet, setSheet] = useState(0),
    [headerRow, setHeaderRow] = useState(1),
    [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState({
      name: 0,
      email: -1,
      phone: 4,
      address: -1,
      status: 3,
    }),
    [excluded, setExcluded] = useState<number[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const rows = sheets[sheet]?.rows || [],
    headers = rows[headerRow - 1] || [];
  const preview = rows
    .slice(headerRow)
    .map((r, i) => ({
      row: headerRow + i + 1,
      name: r[mapping.name]?.trim() || "",
      email: r[mapping.email]?.trim() || "",
      phone: r[mapping.phone]?.trim() || "",
      address: r[mapping.address]?.trim() || "",
      exempt: /^exempt$/i.test(r[mapping.status]?.trim() || ""),
    }))
    .filter((r) => r.name && !excluded.includes(r.row));
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice("Import workflow updated.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h3>Review a spreadsheet before importing</h3>
      <p>
        Start with <strong>Monastery of Abuna Hara Members.xlsx</strong>.
        Registration responses supplement details only after matching.
        Historical collections require a separate financial migration: do not
        import monthly blank cells as unpaid balances or journal summaries as
        receipts.
      </p>
      <p>
        This importer creates pending roster households only, preserving
        explicit Exempt values and source file/tab/row. It never creates sign-in
        accounts, historical arrears or payment mandates.
      </p>
      <button
        className="text-button"
        onClick={() =>
          downloadCsv("arbahara-roster-template.csv", [
            ["Full name", "Email", "Phone", "Address", "Status"],
            ["", "", "", "", "Exempt or blank"],
          ])
        }
      >
        Download CSV template
      </button>
      <label>
        Roster spreadsheet (.xlsx / .csv)
        <input
          type="file"
          accept=".xlsx,.csv"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError("");
            try {
              const parsed = await readSpreadsheet(file);
              setSheets(parsed);
              setSheet(0);
              setExcluded([]);
              setFileName(file.name);
            } catch (e) {
              setError(message(e));
            }
          }}
        />
      </label>
      <ErrorMessage message={error} />
      {notice ? <p role="status">{notice}</p> : null}
      {sheets.length ? (
        <>
          <div className="two-columns">
            <label>
              Sheet
              <select
                value={sheet}
                onChange={(e) => {
                  setSheet(Number(e.target.value));
                  setExcluded([]);
                }}
              >
                {sheets.map((s, i) => (
                  <option key={i} value={i}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Header row
              <input
                type="number"
                min="1"
                max={rows.length || 1}
                value={headerRow}
                onChange={(e) => {
                  setHeaderRow(Math.max(1, Number(e.target.value)));
                  setExcluded([]);
                }}
              />
            </label>
          </div>
          <div className="two-columns">
            {Object.entries(mapping).map(([key, value]) => (
              <label key={key}>
                Column for {key}
                <select
                  value={value}
                  onChange={(e) =>
                    setMapping((old) => ({
                      ...old,
                      [key]: Number(e.target.value),
                    }))
                  }
                >
                  <option value={-1}>Not present</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {i + 1}. {h || "Unnamed"}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p>
            {preview.length} selected rows. Exclude headers, totals, duplicate
            households and non-roster rows before staging. Review the Status
            mapping carefully; no other status is interpreted as Exempt.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Source row</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Exempt</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 300).map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td data-no-translate>{r.name}</td>
                    <td data-no-translate>{r.email}</td>
                    <td data-no-translate>{r.phone}</td>
                    <td>{r.exempt ? "Yes" : "No"}</td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => setExcluded((old) => [...old, r.row])}
                      >
                        Exclude row
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="text-button" onClick={() => setExcluded([])}>
            Restore excluded rows
          </button>
          <button
            className="button"
            disabled={busy || !preview.length || preview.length > 300}
            onClick={() =>
              void run(async () => {
                const bytes = new TextEncoder().encode(
                  JSON.stringify({
                    fileName,
                    sheet: sheets[sheet].name,
                    rows: preview,
                  }),
                );
                const digest = Array.from(
                  new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
                )
                  .map((x) => x.toString(16).padStart(2, "0"))
                  .join("");
                await stage({
                  fileName,
                  sheetName: sheets[sheet].name,
                  fingerprint: digest,
                  rows: preview,
                });
              })
            }
          >
            Stage reviewed roster
          </button>
        </>
      ) : null}
      <h3>Recoverable import batches</h3>
      {batches?.map((b) => (
        <article className="review-row" key={b._id}>
          <h4>
            {b.fileName} · {b.sheetName}
          </h4>
          <p>
            {b.rowCount} rows · {b.status}
          </p>
          {b.status === "staged" && role !== "treasurer" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(() =>
                  commit({
                    id: b._id,
                    confirmed:
                      new FormData(e.currentTarget).get("confirm") === "on",
                  }),
                );
              }}
            >
              <label className="check-label">
                <input type="checkbox" name="confirm" required />I reviewed
                every row, source priority, exemptions and duplicates.
              </label>
              <button className="button" disabled={busy}>
                Commit pending households
              </button>
            </form>
          ) : null}
          {b.status !== "reversed" && role === "admin" ? (
            <details>
              <summary>Recover this batch</summary>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const reason = String(
                    new FormData(e.currentTarget).get("reason"),
                  );
                  void run(() => recover({ id: b._id, reason }));
                }}
              >
                <label>
                  Reason
                  <input name="reason" required maxLength={400} />
                </label>
                <p>
                  Unapproved imported households will be marked inactive, not
                  erased. Approved households require separate financial review.
                </p>
                <button disabled={busy}>Recover batch</button>
              </form>
            </details>
          ) : null}
        </article>
      ))}
    </>
  );
}
