import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  BANK_SHARING_TEXT,
  BANK_SHARING_VERSION,
  validateBankDetails,
  type BankDetails,
  type AchState,
} from "../../convex/achValidation";
import { encryptBankDetails } from "../lib/bankEncryption";
import { ErrorMessage, message } from "../components/Live";
import { money } from "./Giving";
export const achLabels: Record<AchState, string> = {
  submitted: "Awaiting office review",
  needs_information: "Office needs more information",
  ready_for_chase: "Authorization reviewed · awaiting Chase entry",
  entered_in_chase: "Payor entered in Chase · not proof of payment",
  withdrawn: "Withdrawn · bank details removed",
};
export function ManualAch() {
  const mine = useQuery(api.achRecords.mine);
  const availability = useAction(api.achActions.availability),
    prepare = useAction(api.achActions.prepare),
    submit = useAction(api.achActions.submit),
    withdraw = useMutation(api.achRecords.withdraw);
  const [enabled, setEnabled] = useState<boolean | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [eligible, setEligible] = useState(false);
  const [confirmWithdrawal, setConfirmWithdrawal] = useState(false);
  const active = mine?.find((r) => r.status !== "withdrawn");
  useEffect(() => {
    let cancelled = false;
    void availability({})
      .then((r) => {
        if (!cancelled) {
          setEnabled(r.enabled);
          setEligible(r.eligible);
        }
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [availability]);
  return (
    <section className="panel manual-ach">
      <h2>Set up bank payment with the office</h2>
      <p>
        Provide your bank details securely for manual Chase ACH setup. The
        office will contact you for the bank-approved debit authorization and
        agreed collection dates. Submitting this request does not start payments
        or cover dues.
      </p>
      <ol className="office-steps">
        <li>Submit bank details</li>
        <li>Office reviews authorization</li>
        <li>Office sets up the payor in Chase</li>
      </ol>
      <ErrorMessage message={error} />
      {notice ? (
        <p role="status" className="notice">
          {notice}
        </p>
      ) : null}
      {mine === undefined || enabled === null ? (
        <p role="status">Checking secure bank setup…</p>
      ) : active ? (
        <>
          <h3>{achLabels[active.status]}</h3>
          <p data-no-translate>
            {active.bankName} · •••• {active.lastFour}
          </p>
          <p>
            {active.frequency === "monthly"
              ? "Requested monthly dues"
              : "Requested annual dues"}
            : {money(active.amountCents)}
          </p>
          {active.memberMessage ? (
            <p data-no-translate>{active.memberMessage}</p>
          ) : null}
          <p>
            To change the bank account, withdraw this request and submit a new
            one. Withdrawing removes bank details from the website’s active
            records. It does not cancel instructions already entered in Chase;
            contact the office to stop those separately.
          </p>
          {!confirmWithdrawal ? (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirmWithdrawal(true)}
            >
              Withdraw bank setup request
            </button>
          ) : (
            <div
              className="office-review"
              role="group"
              aria-label="Confirm bank request withdrawal"
            >
              <h3>Withdraw this request?</h3>
              <p>
                Full bank details will be removed from active records. This does
                not cancel instructions in Chase. Contact the office separately
                about any existing collection.
              </p>
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setConfirmWithdrawal(false)}
              >
                Keep my setup request
              </button>
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await withdraw({ id: active._id });
                    setConfirmWithdrawal(false);
                    setNotice(
                      "Request withdrawn. Contact the office about any existing Chase collection.",
                    );
                  } catch (e) {
                    setError(message(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Confirm withdrawal
              </button>
            </div>
          )}
        </>
      ) : enabled && !eligible ? (
        <p className="bank-pending">
          The office must link an active, non-exempt household membership before
          you can submit a new bank setup request. Existing requests can still
          be withdrawn here.
        </p>
      ) : enabled ? (
        <BankIntakeForm
          busy={busy}
          onSubmit={async (details) => {
            setBusy(true);
            setError("");
            setNotice("");
            try {
              const challenge = await prepare({});
              const encrypted = await encryptBankDetails(
                details,
                challenge.publicJwk,
                challenge.context,
              );
              await submit({ challengeId: challenge.id, ...encrypted });
              setNotice(
                "Bank details received securely. No payment was initiated. The office will review your request.",
              );
              return true;
            } catch (e) {
              setError(message(e));
              return false;
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : (
        <p className="bank-pending">
          Secure bank-detail intake is being configured. Do not send routing or
          account numbers by email, text, or membership notes. Contact the
          office for another payment option.
        </p>
      )}
      <a className="text-link" href="/visit">
        Contact the monastery office
      </a>
      {mine?.some((r) => r.status === "withdrawn") ? (
        <p className="small">
          Previous withdrawn requests remain in the audit history without their
          full bank numbers.
        </p>
      ) : null}
    </section>
  );
}
/** Also exercised in an isolated local QA harness, never against member records. */
export function BankIntakeForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (d: BankDetails) => Promise<boolean>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [review, setReview] = useState<{
      bank: string;
      lastFour: string;
      holder: string;
      frequency: string;
    } | null>(null),
    [error, setError] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  function read(): BankDetails {
    const f = new FormData(formRef.current!);
    return validateBankDetails({
      accountHolder: String(f.get("accountHolder")),
      bankName: String(f.get("bankName")),
      routingNumber: String(f.get("routingNumber")),
      accountNumber: String(f.get("accountNumber")),
      confirmAccountNumber: String(f.get("confirmAccountNumber")),
      accountType: String(f.get("accountType")),
      ownership: String(f.get("ownership")),
      frequency,
      sharingConsent: f.get("sharingConsent") === "on",
      consentVersion: BANK_SHARING_VERSION,
    });
  }
  return (
    <form
      ref={formRef}
      autoComplete="off"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          const details = read();
          if (!review) {
            setReview({
              bank: details.bankName,
              lastFour: details.accountNumber.slice(-4),
              holder: details.accountHolder,
              frequency,
            });
            return;
          }
          if (await onSubmit(details)) {
            formRef.current?.reset();
            setReview(null);
          }
        } catch (e) {
          setError(message(e));
        }
      }}
    >
      <ErrorMessage message={error} />
      <fieldset disabled={busy} hidden={!!review}>
        <legend>Bank account details</legend>
        <div className="office-form-grid">
          <label>
            Account holder’s legal name
            <input
              name="accountHolder"
              required
              maxLength={120}
              autoComplete="off"
            />
          </label>
          <label>
            Bank name
            <input
              name="bankName"
              required
              maxLength={120}
              autoComplete="off"
            />
          </label>
          <label>
            ACH routing number
            <input
              name="routingNumber"
              required
              inputMode="numeric"
              pattern="[0-9]{9}"
              minLength={9}
              maxLength={9}
              autoComplete="off"
              aria-describedby="routing-help"
            />
          </label>
          <label>
            Account type
            <select name="accountType" required>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </label>
          <label>
            Account number
            <input
              name="accountNumber"
              type="password"
              required
              inputMode="numeric"
              pattern="[0-9]{4,17}"
              minLength={4}
              maxLength={17}
              autoComplete="off"
            />
          </label>
          <label>
            Enter account number again
            <input
              name="confirmAccountNumber"
              type="password"
              required
              inputMode="numeric"
              pattern="[0-9]{4,17}"
              minLength={4}
              maxLength={17}
              autoComplete="off"
            />
          </label>
          <label>
            Account ownership
            <select name="ownership">
              <option value="personal">Personal</option>
              <option value="business">Business</option>
            </select>
          </label>
          <label>
            Requested dues schedule
            <select
              name="frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="monthly">Monthly · $20</option>
              <option value="annual">Annual · $240</option>
            </select>
          </label>
        </div>
        <p id="routing-help" className="small">
          Use the ACH routing number supplied by your bank, not a wire routing
          number. A valid format does not verify account ownership.
        </p>
        <p>
          No bank password, PIN, Social Security number, or debit-card number is
          needed. Do not enter any of those here.
        </p>
        <label className="check-label">
          <input name="sharingConsent" type="checkbox" required />
          <span>{BANK_SHARING_TEXT}</span>
        </label>
      </fieldset>
      {review ? (
        <section
          aria-label="Review bank setup request"
          className="office-review"
        >
          <h3>Review before sending</h3>
          <dl>
            <dt>Account holder</dt>
            <dd data-no-translate>{review.holder}</dd>
            <dt>Bank account</dt>
            <dd data-no-translate>
              {review.bank} · •••• {review.lastFour}
            </dd>
            <dt>Requested dues</dt>
            <dd>
              {review.frequency === "monthly" ? "$20 monthly" : "$240 annually"}
            </dd>
          </dl>
          <p>
            This sends a setup request, not a payment or debit authorization.
            The office will agree the collection dates with you separately.
          </p>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => setReview(null)}
          >
            Go back and edit
          </button>
        </section>
      ) : null}
      <button className="button" disabled={busy}>
        {busy
          ? "Sending encrypted request…"
          : review
            ? "Send secure setup request"
            : "Review bank details"}
      </button>
    </form>
  );
}
