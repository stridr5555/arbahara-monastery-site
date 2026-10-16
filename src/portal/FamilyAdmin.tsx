import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { ErrorMessage, message } from "../components/Live";
type Row = FunctionReturnType<typeof api.spouses.officeQueue>["rows"][number];
function Review({ row, canEdit }: { row: Row; canEdit: boolean }) {
  const verify = useMutation(api.spouses.verifyPhone),
    finalize = useMutation(api.spouses.finalizeReviewed),
    retry = useMutation(api.spouses.retryConsolidation);
  const [email, setEmail] = useState(""),
    [reference, setReference] = useState("");
  const [primary, setPrimary] = useState<"sender" | "recipient">("sender"),
    [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const expired = row.status === "phone_review" && row.expiresAt <= Date.now();
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      const result = await work();
      setNotice(
        result === "household_review"
          ? "The separate household records still need review."
          : "Review saved.",
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="panel">
      <h3>
        {row.senderName} → {row.recipientName || row.contact}
      </h3>
      <p>
        {row.status === "phone_review"
          ? "Verify phone ownership"
          : "Consolidate separate households"}
      </p>
      <ErrorMessage message={error} />
      {notice && <p role="status">{notice}</p>}
      {row.reviewReason && <p>{row.reviewReason}</p>}
      {expired ? (
        <p>
          Expired. Ask the requesting member to cancel and send a new request.
        </p>
      ) : canEdit ? (
        <form
          className="profile-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() =>
              row.status === "phone_review"
                ? verify({
                    id: row.id,
                    recipientEmail: email,
                    verified: reviewed,
                    reference,
                  })
                : finalize({ id: row.id, primary, reviewed, reference }),
            );
          }}
        >
          {row.status === "phone_review" ? (
            <>
              <p>
                Contact the spouse independently and verify ownership of{" "}
                {row.contact}. Do not rely on a member’s editable profile phone
                field. Match their own verified sign-in email, not a shared
                account.
              </p>
              <label>
                Spouse’s verified sign-in email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <p>
                Both spouses have consented. Review both records in Households
                before choosing the approved primary record. This preserves
                received payments and reverses only unpaid future duplicate
                assessments from next month. Historical unpaid dues, prepaid
                dues, unapplied credit, other linked accounts or active
                secondary bank setup block consolidation.
              </p>
              <a
                className="text-link"
                href="/members?view=admin&office=households"
              >
                Open household records
              </a>
              <label>
                Keep this approved household as the family record
                <select
                  value={primary}
                  onChange={(e) =>
                    setPrimary(e.target.value as "sender" | "recipient")
                  }
                >
                  <option value="sender">
                    {row.senderName} · requesting member
                  </option>
                  <option value="recipient">
                    {row.recipientName} · confirming spouse
                  </option>
                </select>
              </label>
              <p className="notice">
                Cancel any duplicate Chase collection instruction in the bank
                separately. This website does not cancel instructions or issue
                refunds.
              </p>
            </>
          )}
          <label>
            Office review reference
            <input
              required
              minLength={3}
              maxLength={150}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
          <label className="consent">
            <input
              type="checkbox"
              required
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            {row.status === "phone_review"
              ? "I independently verified this spouse’s identity, phone ownership and verified account."
              : "I reviewed both household balances, received payments, other linked accounts and bank instructions. This is the approved primary family record."}
          </label>
          <button className="button" disabled={busy || !reviewed}>
            {busy
              ? "Saving…"
              : row.status === "phone_review"
                ? "Forward for spouse confirmation"
                : "Complete reviewed family consolidation"}
          </button>
          {row.status === "household_review" && (
            <button
              className="button secondary"
              type="button"
              disabled={busy || !reviewed}
              onClick={() => void run(() => retry({ id: row.id, reviewed }))}
            >
              Retry empty application connection
            </button>
          )}
        </form>
      ) : (
        <p>
          An administrator or secretary must perform this review. No household
          records have been changed.
        </p>
      )}
    </article>
  );
}
export default function FamilyAdmin({ role }: { role: string }) {
  const queue = useQuery(api.spouses.officeQueue, {});
  const automatic = useQuery(api.familyBilling.officeList, {});
  return (
    <section className="panel">
      <h2>Family connections</h2>
      <p>
        Automatic email and phone matches establish one $20 monthly family dues
        obligation without membership approval. Private account access stays
        separate. Review historical accounting corrections below; do not start
        or change bank collections without the payer’s authorization.
      </p>
      <h3>Automatic family billing connections</h3>
      {automatic === undefined ? (
        <p role="status">Loading automatic connections…</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Spouse contact</th>
                <th>Primary family</th>
                <th>Connection</th>
                <th>Accounting follow-up</th>
              </tr>
            </thead>
            <tbody>
              {automatic.map((r) => (
                <tr key={r._id}>
                  <td data-no-translate>{r.requester}</td>
                  <td data-no-translate>{r.contact}</td>
                  <td data-no-translate>{r.primaryName || "—"}</td>
                  <td>
                    {r.status === "linked"
                      ? "Linked automatically"
                      : r.status === "cancelled"
                        ? "Replaced contact"
                        : "Contact saved for matching"}
                  </td>
                  <td>
                    {r.reconciliationRequired
                      ? "Review existing payments or bank instructions — membership remains active"
                      : "No flagged correction"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h3>Legacy requests for shared household access</h3>
      <p>
        These older requests concern sharing historical household records. They
        do not block membership or automatic family billing.
      </p>
      {queue === undefined ? (
        <p role="status">Loading family review requests…</p>
      ) : (
        <>
          {queue.truncated && (
            <p className="notice">
              Showing up to 50 requests per review type. Complete these to see
              more.
            </p>
          )}
          {!queue.rows.length && (
            <p>No family connections need office review.</p>
          )}
          {queue.rows.map((row) => (
            <Review
              key={row.id}
              row={row}
              canEdit={["admin", "secretary"].includes(role)}
            />
          ))}
        </>
      )}
    </section>
  );
}
