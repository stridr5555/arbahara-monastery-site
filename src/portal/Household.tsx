import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { money } from "./Giving";
import { ManualAch } from "./ManualAch";
export function HouseholdDues({ compact = false }: { compact?: boolean }) {
  const data = useQuery(api.households.mine);
  const [annual, setAnnual] = useState(false);
  if (data === undefined)
    return <p role="status">Loading household membership…</p>;
  if (!data)
    return (
      <section className="panel">
        <h2>Your household membership</h2>
        <p>
          Complete your membership application. Already on the monastery’s
          roster? Ask the office to review and link your existing household
          before creating a duplicate.
        </p>
        <a className="button" href="/members?view=profile">
          Complete membership profile
        </a>
      </section>
    );
  const { household, dues, receipts } = data;
  const current = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const month = `${current.find((p) => p.type === "year")?.value}-${current.find((p) => p.type === "month")?.value}`;
  const outstanding = dues
    .filter((d) => d.month <= month)
    .reduce((s, d) => s + Math.max(0, d.amountCents - d.paidCents), 0);
  const unpaid = dues.filter((d) => d.paidCents < d.amountCents);
  const start = unpaid[0]?.month || household.duesStart;
  const covered = unpaid.slice(0, annual ? 12 : 1);
  return (
    <section className="panel household-dues">
      <div className="section-heading">
        <h2>Household membership</h2>
        <span className="status">
          {household.exempt ? "Exempt" : household.status}
        </span>
      </div>
      <h3>{household.name}</h3>
      {household.status !== "active" ? (
        <p>
          Your application is awaiting office review. Approval does not require
          an offering. New dues begin the Gregorian month after approval.
        </p>
      ) : household.exempt ? (
        <p>
          Your household is exempt from membership dues. Optional giving is
          always welcome.
        </p>
      ) : (
        <>
          <p>
            <strong>Monthly dues · $20</strong>
            <br />
            $240 covers 12 consecutive Gregorian months. Extra gifts are
            separate.
          </p>
          <p>
            Due through this month: <strong>{money(outstanding)}</strong>
          </p>
          <div className="dues-grid">
            {dues.slice(0, compact ? 6 : 24).map((d) => (
              <div
                key={d._id}
                className={`dues-month ${d.paidCents >= d.amountCents ? "paid" : d.month > month ? "future" : ""}`}
              >
                <strong>{d.month}</strong>
                <span>
                  {d.paidCents >= d.amountCents
                    ? "Covered"
                    : d.paidCents
                      ? `Partial · ${money(d.paidCents)}`
                      : d.month > month
                        ? "Upcoming"
                        : "Outstanding"}
                </span>
              </div>
            ))}
          </div>
          {!compact ? (
            <>
              <div className="calendar-switch">
                <button aria-pressed={!annual} onClick={() => setAnnual(false)}>
                  One month · $20
                </button>
                <button aria-pressed={annual} onClick={() => setAnnual(true)}>
                  12 months · $240
                </button>
              </div>
              <p className="small">
                Coverage preview: {start || "ask the office"}
                {annual && covered.length
                  ? ` through ${covered.at(-1)?.month}`
                  : ""}
                . The office confirms allocations against the actual collection.
                Historical blanks are not treated as arrears.
              </p>
              <ManualAch />
            </>
          ) : null}
        </>
      )}
      {compact ? (
        <a className="button full" href="/members?view=dues">
          Manage household dues
        </a>
      ) : (
        <>
          <h3>Household collections</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Dues</th>
                  <th>Extra gift</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r._id}>
                    <td>{r.date}</td>
                    <td>{r.method}</td>
                    <td>{money(r.duesCents)}</td>
                    <td>{money(r.giftCents)}</td>
                    <td>{r.reversedBy ? "Reversed" : "Recorded"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!receipts.length ? (
            <p>No reconciled household collections yet.</p>
          ) : null}
        </>
      )}
    </section>
  );
}
