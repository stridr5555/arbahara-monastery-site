import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ErrorMessage, message } from "../components/Live";

export function FamilyConnection() {
  const rows = useQuery(api.familyBilling.mine);
  const link = useMutation(api.familyBilling.link);
  const [kind, setKind] = useState<"email" | "phone">("phone");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const linked = rows?.some((r) => r.status === "linked");
  return (
    <section className="panel">
      <h2>Connect with your spouse</h2>
      <p>
        <strong>One family membership · $20 per month total.</strong> Enter your
        spouse’s registered email or phone number. An exact, unique match links
        family billing automatically. No spouse or office approval is needed.
      </p>
      <p>
        Each spouse keeps a separate sign-in. A billing connection does not
        grant access to the other person’s profile, personal giving, past
        payment records, bank details or staff permissions.
      </p>
      <ErrorMessage message={error} />
      {rows === undefined ? (
        <p role="status">Loading family connection…</p>
      ) : linked ? (
        <div className="notice" role="status">
          <h3>Your family is linked</h3>
          <p>
            Future dues are assessed once for your family. Membership is active,
            not awaiting approval. Existing payments and bank instructions
            remain unchanged; contact the office to correct old duplicate
            records or collection arrangements.
          </p>
        </div>
      ) : (
        <>
          {rows.some((r) => r.status === "waiting_for_match") && (
            <p role="status" className="notice">
              Spouse contact saved. It will link automatically when one eligible
              matching registration is found. Your membership remains active. No
              match or an ambiguous shared contact does not delay membership.
            </p>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              setSaved(false);
              try {
                await link({ kind, contact, consent: true });
                setSaved(true);
              } catch (e) {
                setError(message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Find your spouse using / <span lang="am">ባለቤትዎን ያገናኙ</span>
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as "email" | "phone");
                  setContact("");
                }}
              >
                <option value="phone">Phone number</option>
                <option value="email">Email address</option>
              </select>
            </label>
            <label>
              {kind === "phone"
                ? "Spouse’s phone number"
                : "Spouse’s email address"}
              <input
                type={kind === "phone" ? "tel" : "email"}
                name="spouseContact"
                required
                maxLength={254}
                value={contact}
                autoComplete="off"
                onChange={(e) => setContact(e.target.value)}
              />
            </label>
            <label className="check-label">
              <input type="checkbox" required />I confirm this person is my
              spouse and want one $20 monthly family dues account. Private
              accounts and bank records remain separate.
            </label>
            <button className="button" disabled={busy}>
              {busy ? "Saving…" : "Save & link family automatically"}
            </button>
          </form>
          {saved && (
            <p role="status">Spouse contact saved. No payment was initiated.</p>
          )}
        </>
      )}
      <p className="small">
        Use a ten-digit US phone number or include the country code for an
        international number. Shared or duplicate contacts are never matched
        arbitrarily. Contact the office for corrections, not membership
        approval.
      </p>
      <a className="text-link" href="/members?view=bank-setup">
        Continue to ACH setup
      </a>
    </section>
  );
}
