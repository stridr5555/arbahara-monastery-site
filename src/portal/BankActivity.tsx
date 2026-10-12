import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { usePlaidLink } from "react-plaid-link";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ErrorMessage, message } from "../components/Live";
import { money } from "./Giving";
import { downloadCsv } from "../lib/spreadsheet";

function LinkButton({
  token,
  onSuccess,
  onExit,
}: {
  token: string;
  onSuccess: (token: string) => void;
  onExit: () => void;
}) {
  const { open, ready } = usePlaidLink({
    token,
    onSuccess: (publicToken) => {
      if (publicToken) onSuccess(publicToken);
      else onExit();
    },
    onExit,
  });
  return (
    <button className="button" disabled={!ready} onClick={() => open()}>
      Open secure bank connection
    </button>
  );
}
export function BankActivity({ role }: { role: string }) {
  const status = useQuery(api.bankRecords.status),
    linkToken = useAction(api.bankActions.linkToken),
    exchange = useAction(api.bankActions.exchange),
    disconnect = useAction(api.bankActions.disconnect);
  const [confirmed, setConfirmed] = useState(false),
    [token, setToken] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h3>Bank activity & reconciliation</h3>
      <p>
        Plaid reads bank transactions for matching to the monastery’s ledger. It
        does not collect dues, initiate ACH debits, or turn a bank deposit into
        income automatically. Chase’s debit activation is a separate bank
        approval.
      </p>
      <ErrorMessage message={error} />
      {notice ? <p role="status">{notice}</p> : null}
      {!status ? (
        <p>Checking bank connection configuration…</p>
      ) : !status.configured ? (
        <p className="bank-pending">
          Plaid is not configured in this environment. No bank is connected and
          no live bank figures are being displayed.
        </p>
      ) : (
        <>
          {status.environment === "sandbox" ? (
            <p className="bank-pending">
              Sandbox only · sample bank activity, not a real account or
              payment.
            </p>
          ) : null}
          {role === "admin" ? (
            <div className="bank-pending">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                I have authority to connect the monastery’s bank account for
                read-only accounting access.
              </label>
              {token ? (
                <LinkButton
                  token={token}
                  onExit={() => setToken(null)}
                  onSuccess={(publicToken) => {
                    setToken(null);
                    void run(async () => {
                      await exchange({ publicToken });
                      setNotice(
                        "Bank read access connected. Initial transaction sync has been queued.",
                      );
                    });
                  }}
                />
              ) : (
                <button
                  className="button"
                  disabled={busy || !confirmed}
                  onClick={() =>
                    void run(async () =>
                      setToken(
                        await linkToken({ confirmMonasteryAccount: confirmed }),
                      ),
                    )
                  }
                >
                  Connect bank for reconciliation
                </button>
              )}
            </div>
          ) : (
            <p>
              Only an administrator can connect or disconnect the bank. Treasury
              staff can reconcile activity.
            </p>
          )}
        </>
      )}
      {status?.connections.map((connection) => (
        <div className="panel" key={connection._id}>
          <h4>{connection.institution}</h4>
          <p>
            {connection.status} ·{" "}
            {connection.lastSyncedAt
              ? `Last synced ${new Date(connection.lastSyncedAt).toLocaleString()}`
              : "Not synced yet"}
          </p>
          {connection.lastError ? (
            <p role="status">{connection.lastError}</p>
          ) : null}
          {role === "admin" && connection.status !== "disconnected" ? (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Stop bank read access? Historical activity and ledger entries will be retained.",
                  )
                )
                  void run(async () => {
                    const result = await disconnect({ id: connection._id });
                    setNotice(
                      result.removed
                        ? "Bank read access disconnected; historical records retained."
                        : "Local access stopped. Plaid could not confirm revocation; remove access in your bank/Plaid account too.",
                    );
                  });
              }}
            >
              Disconnect read access
            </button>
          ) : null}
          <Transactions
            id={connection._id}
            connected={connection.status === "connected"}
          />
        </div>
      ))}
    </section>
  );
}
function Transactions({
  id,
  connected,
}: {
  id: Id<"bankConnections">;
  connected: boolean;
}) {
  const rows = useQuery(api.bankRecords.rows, { id }),
    ledger = useQuery(api.finance.dashboard, {
      through: new Date().toISOString().slice(0, 10),
    }),
    match = useMutation(api.bankRecords.match),
    unmatch = useMutation(api.bankRecords.unmatch),
    sync = useAction(api.bankActions.sync);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice("Saved. Reconciliation audit updated.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="filter-row">
        <button
          className="text-button"
          disabled={busy || !connected}
          onClick={() => void run(() => sync({ id }))}
        >
          Sync bank activity
        </button>
        <button
          className="text-button"
          disabled={!rows?.length}
          onClick={() =>
            downloadCsv("arbahara-bank-review.csv", [
              [
                "Date",
                "Description",
                "Amount USD (outflow positive)",
                "Pending",
                "Removed",
                "Matched journal",
              ],
              ...(rows || []).map((t) => [
                t.date,
                t.name,
                (t.amountCents / 100).toFixed(2),
                t.pending,
                t.removed,
                t.matchedJournalId || "",
              ]),
            ])
          }
        >
          Export review CSV
        </button>
      </div>
      <ErrorMessage message={error} />
      {notice ? <p role="status">{notice}</p> : null}
      <p className="small">
        Latest 300 transactions · positive amounts are money leaving the bank.
        Matches require the same bank amount and a journal date within seven
        days. Matching never creates another journal or changes the bank.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Activity</th>
              <th>Bank movement</th>
              <th>Ledger match</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((t) => {
              const candidates =
                ledger?.journals.filter(
                  (j) =>
                    !j.reversedBy &&
                    Math.abs(Date.parse(j.date) - Date.parse(t.date)) <=
                      7 * 86400000 &&
                    j.lines
                      .filter((l) => l.account === "1000")
                      .reduce((s, l) => s + l.debitCents - l.creditCents, 0) ===
                      -t.amountCents,
                ) || [];
              return (
                <tr key={t._id}>
                  <td>{t.date}</td>
                  <td data-no-translate>
                    {t.name}
                    <small>
                      {t.removed
                        ? "Removed by bank"
                        : t.pending
                          ? "Pending"
                          : "Posted"}
                    </small>
                  </td>
                  <td>
                    {t.amountCents >= 0 ? "Out " : "In "}
                    {money(Math.abs(t.amountCents))}
                  </td>
                  <td>
                    {t.matchedJournalId ? (
                      <>
                        <small>{t.matchedJournalId}</small>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => {
                            const reason = window.prompt(
                              "Reason for removing this match:",
                            );
                            if (reason)
                              void run(() => unmatch({ id: t._id, reason }));
                          }}
                        >
                          Remove match
                        </button>
                      </>
                    ) : !t.pending && !t.removed ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const journalId = String(
                            new FormData(e.currentTarget).get("journal"),
                          ) as Id<"journals">;
                          void run(() => match({ id: t._id, journalId }));
                        }}
                      >
                        <select
                          aria-label={`Journal for ${t.name} on ${t.date}`}
                          name="journal"
                          required
                        >
                          <option value="">
                            {candidates.length
                              ? "Choose reviewed journal"
                              : "No matching recent journal"}
                          </option>
                          {candidates.map((j) => (
                            <option key={j._id} value={j._id}>
                              {j.date} · {j.description}
                            </option>
                          ))}
                        </select>
                        <button
                          className="text-button"
                          disabled={busy || !candidates.length}
                        >
                          Confirm match
                        </button>
                      </form>
                    ) : (
                      "Not matchable"
                    )}
                  </td>
                </tr>
              );
            })}
            {rows?.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  No activity synced yet. A new connection may take time to
                  prepare its transaction history.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
