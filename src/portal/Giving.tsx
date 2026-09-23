import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { fundNames, OfferingForm } from "../pages/Give";
import { ErrorMessage, message, downloadJson } from "../components/Live";
import { site } from "../content";
export function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
export function GivingHistory({ compact = false }: { compact?: boolean }) {
  const gifts = useQuery(api.donations.mine);
  const subs = useQuery(api.donations.subscriptions);
  const portal = useAction(api.payments.billingPortal);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function manage() {
    setBusy(true);
    try {
      window.location.assign(await portal({}));
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Giving history</h2>
        {!compact && gifts?.length ? (
          <button
            type="button"
            className="text-button"
            onClick={() =>
              downloadJson("arbahara-giving-records.json", {
                exportedAt: new Date().toISOString(),
                gifts,
              })
            }
          >
            Download records
          </button>
        ) : null}
      </div>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">Your donation records</caption>
          <thead>
            <tr>
              <th>Date</th>
              <th>Fund</th>
              <th>Method</th>
              <th>Status</th>
              <th className="numeric">Amount</th>
            </tr>
          </thead>
          <tbody>
            {gifts?.slice(0, compact ? 5 : 500).map((d) => (
              <tr key={d._id}>
                <td>{d.giftDate}</td>
                <td>{fundNames[d.fund] || d.fund}</td>
                <td>{d.method.toUpperCase()}</td>
                <td>
                  <span className={`status ${d.status}`}>{d.status}</span>
                  {d.refundedCents ? (
                    <small>Refunded {money(d.refundedCents)}</small>
                  ) : null}
                  {d.reviewNote ? (
                    <details>
                      <summary>Review note</summary>
                      <span data-no-translate>{d.reviewNote}</span>
                    </details>
                  ) : null}
                </td>
                <td className="numeric">{money(d.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!gifts ? (
        <p className="empty">Loading your records…</p>
      ) : !gifts.length ? (
        <div className="empty">
          <p>Your gifts will appear here once you begin giving.</p>
          <a className="button" href="/members?view=give">
            Make an offering
          </a>
        </div>
      ) : null}
      {!compact ? (
        <>
          <p className="small">
            Reported Zelle transfers and pending bank payments are not confirmed
            gifts. Contact the office for official acknowledgments or
            corrections.
          </p>
          {subs?.length ? (
            <div className="subscription-list">
              <h3>Monthly giving</h3>
              {subs.map((s) => (
                <p key={s._id}>
                  {money(s.amountCents)} per month · {fundNames[s.fund]} ·{" "}
                  <span className="status">{s.status}</span>
                </p>
              ))}
              <button
                className="button secondary"
                disabled={busy}
                onClick={manage}
              >
                Manage monthly giving
              </button>
            </div>
          ) : null}
          <ErrorMessage message={error} />
        </>
      ) : null}
    </section>
  );
}
export function MemberGive() {
  const checkout = useAction(api.payments.checkout);
  const report = useMutation(api.donations.reportZelle);
  const availability = useQuery(api.paymentRecords.availability);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState<{
    amountCents: number;
    fund: string;
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  return (
    <div className="member-give">
      <div>
        <h2>Give with a grateful heart.</h2>
        <p>
          Your offering supports the monastery’s life and future. You will see
          the status in your giving history.
        </p>
        {availability && !availability.ach ? (
          <div className="notice">
            <h3>Bank giving is being prepared</h3>
            <p>
              You can give through Zelle now. Online ACH will open after the
              monastery’s receiving account is confirmed.
            </p>
          </div>
        ) : null}
        {saved ? (
          <div className="panel">
            <h3>Your transfer report has been saved.</h3>
            <p>
              The treasurer will check it against the bank record. Until then,
              it will appear as “reported” in your giving history.
            </p>
            <a className="text-link" href="/members?view=giving">
              View giving history
            </a>
          </div>
        ) : reporting ? (
          <form
            className="panel"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const f = new FormData(e.currentTarget);
              try {
                await report({
                  ...reporting,
                  giftDate: String(f.get("date")),
                  reference: String(f.get("reference")),
                  requestId,
                });
                setSaved(true);
                setReporting(null);
                setRequestId(crypto.randomUUID());
              } catch (e) {
                setError(message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <h3>Report a Zelle transfer</h3>
            <p>
              {money(reporting.amountCents)} · {fundNames[reporting.fund]}
            </p>
            <p>
              Submit this form only after sending the transfer through your
              bank.
            </p>
            <label>
              Transfer date
              <input
                type="date"
                name="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </label>
            <label>
              Bank confirmation reference
              <input
                name="reference"
                maxLength={100}
                required
                autoComplete="off"
              />
            </label>
            <p className="small">
              Enter the transaction reference, not your bank account number.
            </p>
            <label className="check-label">
              <input type="checkbox" required />I have sent this transfer and
              understand that the treasurer must verify it.
            </label>
            <button className="button" disabled={busy}>
              {busy ? "Saving…" : "Submit transfer for review"}
            </button>
          </form>
        ) : (
          <p>
            Questions about a gift?{" "}
            <a href={`mailto:${site.email}`}>Contact the monastery office.</a>
          </p>
        )}
        <ErrorMessage message={error} />
      </div>
      <OfferingForm
        disabled={busy}
        onContinue={async (a) => {
          setError("");
          setSaved(false);
          if (a.method === "zelle") {
            setReporting({ amountCents: a.amountCents, fund: a.fund });
            return;
          }
          setBusy(true);
          try {
            window.location.assign(
              await checkout({
                amountCents: a.amountCents,
                fund: a.fund,
                frequency: a.frequency,
                requestId,
              }),
            );
          } catch (e) {
            setError(message(e));
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
