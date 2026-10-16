import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
export default function OfficeHome({
  choose,
}: {
  choose: (view: string) => void;
}) {
  const queue = useQuery(api.office.workQueue);
  const actions = [
    [
      "dues-reports",
      "Check previously paid dues",
      "Reconcile members’ Zelle, check and cash reports against existing records before agreeing to ACH start dates.",
    ],
    [
      "record",
      "Record a received payment",
      "Cash, Zelle, check, bank ACH or card settlement. Review the member and dues coverage before saving.",
    ],
    [
      "households",
      "Find or review a household",
      "Find the household record, review an application, and link its verified website account.",
    ],
    [
      "family",
      "Connect spouses and review family dues",
      "Verify phone ownership or review separate household records before combining them into one $20 family membership.",
    ],
    [
      "manual-ach",
      "Review bank setup requests",
      "Review encrypted bank-information requests and the separate authorization before manual Chase entry.",
    ],
    [
      "bank",
      "Match bank activity",
      "Connect read-only Plaid when configured, sync transactions and match them to recorded collections.",
    ],
    [
      "imports",
      "Import a membership spreadsheet",
      "Preview the file, check duplicates and review every change before importing.",
    ],
    [
      "reports",
      "Prepare financial statements",
      "Review posted balances and fund statements. These are ledger reports, not live bank balances.",
    ],
  ];
  return (
    <section className="panel office-home">
      <h2>What would you like to do?</h2>
      <p>
        Choose a task. Each payment must be verified before it becomes a
        received collection; bank setup is separate from payment.
      </p>
      <h3>Needs attention</h3>
      {queue === undefined ? (
        <p role="status">Checking the office work queue…</p>
      ) : (
        <ul className="office-work-list">
          {[
            [
              "dues-reports",
              "Previous dues needing reconciliation",
              queue.duesReports,
            ],
            ["households", "Households awaiting review", queue.households],
            ["family", "Family connections needing review", queue.families],
            [
              "treasury",
              "Reported gifts awaiting bank verification",
              queue.gifts,
            ],
            ["manual-ach", "New bank setup requests", queue.requests],
            [
              "manual-ach",
              "Authorized requests awaiting Chase entry",
              queue.ready,
            ],
          ].map(([view, label, count]) => (
            <li key={String(label)}>
              <button
                className="text-button"
                onClick={() => choose(String(view))}
              >
                {String(label)}
              </button>
              <strong>{Number(count) > 100 ? "100+" : count}</strong>
            </li>
          ))}
        </ul>
      )}
      <div className="office-action-list">
        {actions.map(([view, title, description]) => (
          <button type="button" key={view} onClick={() => choose(view)}>
            <strong>{title}</strong>
            <span>{description}</span>
          </button>
        ))}
      </div>
      <p className="small">
        Advanced bookkeeping, corrections, period closing and audit records
        remain available in the office menu. Existing staff permissions still
        apply.
      </p>
    </section>
  );
}
