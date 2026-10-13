import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { FAMILY_CONSENT } from "../lib/familyContact";
import { ErrorMessage, message } from "../components/Live";
import { money } from "./Giving";
const labels = {
  pending: "Awaiting your spouse’s confirmation",
  phone_review: "Office will verify phone ownership",
  household_review: "Both confirmed · office review needed",
  linked: "Connected · one family membership",
  declined: "Request declined",
  cancelled: "Request cancelled",
};
export function FamilyConnection() {
  const rows = useQuery(api.spouses.mine, {});
  const household = useQuery(api.households.mine, {});
  const history = useQuery(api.spouses.history, {});
  const send = useMutation(api.spouses.request),
    respond = useMutation(api.spouses.respond),
    cancel = useMutation(api.spouses.cancel);
  const [kind, setKind] = useState<"email" | "phone">("email");
  const [contact, setContact] = useState(""),
    [consent, setConsent] = useState(false);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const act = async (work: () => Promise<unknown>, result: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      setNotice(result);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const paired = rows?.some((r) =>
    ["linked", "household_review"].includes(r.status),
  );
  const awaiting = rows?.some(
    (r) =>
      ["pending", "phone_review"].includes(r.status) &&
      r.expiresAt > Date.now(),
  );
  return (
    <section className="panel">
      <h2>Connect with your spouse</h2>
      <p lang="am">የትዳር አጋር ግንኙነት · የቤተሰብ አባልነት</p>
      <p className="notice">
        <strong>$20 per month for the whole family.</strong> Both spouses share
        one household dues record. A $240 collection covers 12 months for the
        family, not one person. Office-approved exemptions remain in effect.
      </p>
      <p>
        Keep separate sign-ins. Each spouse must first save a membership
        profile. An email request appears when your spouse signs in with that
        verified email; no email or text is sent. Phone requests go to the
        office for identity verification before your spouse can confirm.
      </p>
      <ErrorMessage message={error} />
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {rows === undefined ? (
        <p role="status">Loading family connections…</p>
      ) : (
        rows.map((r) => {
          const expired =
            ["pending", "phone_review"].includes(r.status) &&
            r.expiresAt <= Date.now();
          return (
            <article className="panel" key={r.id}>
              <h3>{r.peerName || r.contact || "Spouse request"}</h3>
              <p>
                <strong>
                  {expired
                    ? "Request expired · send a new request"
                    : r.incoming && r.status === "pending"
                      ? "Your spouse invited you · confirm below"
                      : labels[r.status]}
                </strong>
              </p>
              {r.reviewReason && <p>{r.reviewReason}</p>}
              {r.effectiveMonth && (
                <p>
                  One family obligation from {r.effectiveMonth}. Your own older
                  records remain available below.
                </p>
              )}
              {r.status === "linked" && (
                <a className="button secondary" href="/members?view=dues">
                  View our family dues
                </a>
              )}
              {r.incoming && r.status === "pending" && !expired && (
                <>
                  <label className="consent">
                    <input
                      type="checkbox"
                      checked={!!accepted[r.id]}
                      onChange={(e) =>
                        setAccepted((v) => ({ ...v, [r.id]: e.target.checked }))
                      }
                    />
                    {FAMILY_CONSENT}
                  </label>
                  <div className="actions">
                    <button
                      className="button"
                      disabled={busy || !accepted[r.id]}
                      onClick={() =>
                        void act(
                          () =>
                            respond({
                              id: r.id,
                              accept: true,
                              consent: !!accepted[r.id],
                            }),
                          "Your confirmation was saved. Check the connection status below.",
                        )
                      }
                    >
                      Confirm spouse connection
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          () =>
                            respond({
                              id: r.id,
                              accept: false,
                              consent: false,
                            }),
                          "Request declined. Your household was not changed.",
                        )
                      }
                    >
                      Decline request
                    </button>
                  </div>
                </>
              )}
              {((!r.incoming &&
                ["pending", "phone_review"].includes(r.status)) ||
                r.status === "household_review") && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    void act(
                      () => cancel({ id: r.id }),
                      "Request cancelled. Existing households and payments were not changed.",
                    )
                  }
                >
                  Cancel this request
                </button>
              )}
            </article>
          );
        })
      )}
      {!paired &&
        !awaiting &&
        (household ? (
          <form
            className="profile-form"
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                await send({ kind, contact, consent });
                setContact("");
                setConsent(false);
              }, "Request saved privately. Ask your spouse to sign in and open Family connection; phone requests need office verification first.");
            }}
          >
            <h3>Send a private connection request</h3>
            <label>
              Find your spouse using
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as "email" | "phone")}
              >
                <option value="email">Email address</option>
                <option value="phone">Phone number</option>
              </select>
            </label>
            <label>
              {kind === "email"
                ? "Spouse’s sign-in email"
                : "Spouse’s phone number"}
              <input
                type={kind === "email" ? "email" : "tel"}
                autoComplete="off"
                maxLength={kind === "email" ? 254 : 40}
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </label>
            <label className="consent">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              {FAMILY_CONSENT}
            </label>
            <button className="button" disabled={busy || !consent}>
              {busy ? "Saving…" : "Send spouse request"}
            </button>
          </form>
        ) : household === null ? (
          <a className="button" href="/members?view=profile">
            Complete your membership profile first
          </a>
        ) : null)}
      <p className="small">
        Need to correct or end an existing connection? Contact the office.
        Sharing membership never shares passwords, staff access or full bank
        numbers. A spouse connection does not authorize any bank debit.
      </p>
      {history?.map((h) => (
        <section key={h.householdId}>
          <h3>Your previous household records · {h.name}</h3>
          <p>
            These older records remain yours; they are not shared with your
            spouse. Cancelled duplicate future assessments remain in the audit
            trail.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Dues</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {h.receipts.map((r) => (
                  <tr key={r._id}>
                    <td>{r.date}</td>
                    <td>{r.method}</td>
                    <td>{money(r.duesCents)}</td>
                    <td>{r.reversedBy ? "Reversed" : "Recorded"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!h.receipts.length && <p>No collections on this previous record.</p>}
        </section>
      ))}
    </section>
  );
}
