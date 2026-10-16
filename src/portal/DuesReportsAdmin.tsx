import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { ErrorMessage, message } from "../components/Live";

type Report = FunctionReturnType<typeof api.duesReports.pending>[number];
function ReportReview({
  report,
  onRecord,
}: {
  report: Report;
  onRecord: () => void;
}) {
  const review = useMutation(api.duesReports.review);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <article className="office-request">
      <h3 data-no-translate>{report.householdName || report.email}</h3>
      <p data-no-translate>{report.email}</p>
      {report.billingName !== report.householdName ? (
        <p>
          Primary family billing record:{" "}
          <span data-no-translate>{report.billingName}</span>
        </p>
      ) : null}
      <p>
        {report.answer === "yes"
          ? "Member reports a previous payment"
          : "Member is unsure and requests help"}
      </p>
      <dl className="form-review">
        <div>
          <dt>Payment method</dt>
          <dd>
            {report.method === "zelle"
              ? "Zelle"
              : report.method === "check"
                ? "Check"
                : report.method === "cash"
                  ? "Cash"
                  : "Not provided"}
          </dd>
        </div>
        <div>
          <dt>Reported amount</dt>
          <dd>
            {report.amountCents
              ? `$${(report.amountCents / 100).toFixed(2)}`
              : "Not provided"}
          </dd>
        </div>
        <div>
          <dt>Reported payment date</dt>
          <dd data-no-translate>{report.date || "—"}</dd>
        </div>
        <div>
          <dt>Reported coverage</dt>
          <dd data-no-translate>{report.coverage || "—"}</dd>
        </div>
        <div>
          <dt>Reference or details</dt>
          <dd data-no-translate>{report.reference || "—"}</dd>
        </div>
      </dl>
      <p>
        Check bank deposits, cash receipts, checks and imported spreadsheets
        first. If this payment is already recorded, do not record it again.
        Confirm paid-through months before agreeing to the family’s ACH start
        date.
      </p>
      <button type="button" className="button secondary" onClick={onRecord}>
        Open received-payment bookkeeping
      </button>
      <form
        className="profile-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            note = String(new FormData(form).get("note") || "");
          setError("");
          setBusy(true);
          try {
            await review({
              id: report._id,
              expectedUpdatedAt: report.updatedAt,
              note,
            });
          } catch (err) {
            setError(message(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Reconciliation outcome and reference
          <textarea
            name="note"
            required
            maxLength={500}
            placeholder="Existing receipt reference, newly recorded receipt, or correction/contact needed. Never include bank account numbers."
          />
        </label>
        <label className="check-label">
          <input type="checkbox" required />I checked the available records and
          documented the outcome. Reviewing this report does not create a
          receipt, change dues coverage, or authorize ACH.
        </label>
        <ErrorMessage message={error} />
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save reconciliation review"}
        </button>
      </form>
    </article>
  );
}
export default function DuesReportsAdmin({
  onRecord,
}: {
  onRecord: () => void;
}) {
  const reports = useQuery(api.duesReports.pending);
  const [search, setSearch] = useState("");
  const found = reports?.filter((r) =>
    `${r.householdName} ${r.email} ${r.billingName}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <section className="panel">
      <h2>Review previously paid dues</h2>
      <p>
        These are member declarations, not confirmed collections. Membership is
        already active. Reconcile prior Zelle, check and cash payments before
        scheduling ACH for the same months.
      </p>
      <label>
        Find a reported payment
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {reports === undefined ? (
        <p role="status">Loading previous-dues reports…</p>
      ) : (
        <>
          {reports.length > 100 ? (
            <p>
              Showing the first 100 reports awaiting review. Reviewed reports
              leave this queue; remaining reports appear next.
            </p>
          ) : null}
          {!found?.length ? (
            <p role="status">No previous-dues reports match this queue.</p>
          ) : (
            found
              .slice(0, 100)
              .map((report) => (
                <ReportReview
                  key={`${report._id}:${report.updatedAt}`}
                  report={report}
                  onRecord={onRecord}
                />
              ))
          )}
        </>
      )}
    </section>
  );
}
