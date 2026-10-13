import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import type { AchState } from "../../convex/achValidation";
import { canTransitionAch } from "../../convex/achValidation";
import { ErrorMessage, message } from "../components/Live";
import { money } from "./Giving";
import { achLabels } from "./ManualAch";
type SafeRequest = Omit<Doc<"achRequests">, "encryptedDetails"> & {
  householdName: string;
};
export default function ManualAchAdmin({ role }: { role: string }) {
  const [filter, setFilter] = useState<AchState>("submitted"),
    [search, setSearch] = useState("");
  const [savedNotice, setSavedNotice] = useState("");
  const data = useQuery(api.achRecords.queue, { status: filter });
  return (
    <section className="panel manual-ach">
      <h2>Manual Chase bank setup</h2>
      <p>
        Work through each request: review the member’s details, obtain the
        bank-approved debit authorization, then add the payor in Chase. No
        status here initiates a collection or marks dues paid.
      </p>
      {savedNotice ? <p role="status">{savedNotice}</p> : null}
      <div className="office-form-grid">
        <label>
          Show requests
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as AchState)}
          >
            {Object.entries(achLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Find a household
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {data === undefined ? (
        <p role="status">Loading bank setup requests…</p>
      ) : (
        <>
          {data.truncated ? (
            <p>
              Showing the latest 100 requests in this status. Narrow the queue
              by status; contact the administrator for older records.
            </p>
          ) : null}
          {!data.rows.length ? (
            <div className="office-empty">
              <h3>No requests in this step</h3>
              <p>
                Members submit their bank setup request from Membership dues.
                New requests appear here automatically.
              </p>
            </div>
          ) : null}
          {data.rows
            .filter((r) =>
              `${r.householdName} ${r.accountHolder} ${r.bankName}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((r) => (
              <Request
                key={`${r._id}:${r.updatedAt}`}
                request={r}
                role={role}
                onSaved={(next) => {
                  setFilter(next);
                  setSavedNotice("Review saved. No payment was initiated.");
                }}
              />
            ))}
          {data.rows.length &&
          !data.rows.some((r) =>
            `${r.householdName} ${r.accountHolder} ${r.bankName}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          ) ? (
            <p>No household matches this search in the selected queue.</p>
          ) : null}
        </>
      )}
      <p className="small">
        Routing and account numbers are excluded from spreadsheets, ordinary
        lists and audit notes. Secretaries review masked records; only
        authorized administrators and treasurers can temporarily view full
        details after authorization review.
      </p>
      <a
        className="text-link"
        href="https://www.chase.com/business/support/banking/collect-and-deposit"
        target="_blank"
        rel="noreferrer"
      >
        Read Chase ACH Collections instructions
      </a>
    </section>
  );
}
function Request({
  request: r,
  role,
  onSaved,
}: {
  request: SafeRequest;
  role: string;
  onSaved: (next: AchState) => void;
}) {
  const review = useMutation(api.achRecords.review),
    reveal = useAction(api.achActions.reveal);
  const [next, setNext] = useState<AchState>(
    r.status === "submitted"
      ? "needs_information"
      : r.status === "needs_information"
        ? "ready_for_chase"
        : r.status === "ready_for_chase" && role !== "secretary"
          ? "entered_in_chase"
          : "withdrawn",
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [details, setDetails] = useState<Awaited<
      ReturnType<typeof reveal>
    > | null>(null),
    [privateScreen, setPrivateScreen] = useState(false);
  useEffect(() => {
    if (!details) return;
    const hide = () => setDetails(null),
      visibility = () => {
        if (document.hidden) hide();
      };
    const timer = window.setTimeout(
      hide,
      Math.max(0, details.expiresAt - Date.now()),
    );
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [details]);
  return (
    <article className="office-request">
      <header>
        <h3 data-no-translate>{r.householdName}</h3>
        <span>{achLabels[r.status]}</span>
      </header>
      <p data-no-translate>
        {r.accountHolder} · {r.bankName} · •••• {r.lastFour}
      </p>
      <p>
        {r.frequency === "monthly" ? "Monthly dues" : "Annual dues"}:{" "}
        {money(r.amountCents)} ·{" "}
        {r.accountType === "checking" ? "Checking" : "Savings"} ·{" "}
        {r.ownership === "personal" ? "Personal" : "Business"}
      </p>
      <p className="small">
        Bank-information sharing consent received; separate debit authorization
        is required.
      </p>
      {r.memberMessage ? <p data-no-translate>{r.memberMessage}</p> : null}
      <ErrorMessage message={error} />
      {notice ? <p role="status">{notice}</p> : null}
      {r.status === "ready_for_chase" && role !== "secretary" ? (
        <section className="office-reveal">
          {details ? (
            <>
              <h4>
                Private view · closes within 60 seconds or when you leave this
                window
              </h4>
              <p>
                Routing: <code data-no-translate>{details.routingNumber}</code>
                <br />
                Account: <code data-no-translate>{details.accountNumber}</code>
              </p>
              <button
                className="button secondary"
                type="button"
                onClick={() => setDetails(null)}
              >
                Hide bank details now
              </button>
            </>
          ) : (
            <>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={privateScreen}
                  onChange={(e) => setPrivateScreen(e.target.checked)}
                />
                I am on a private screen and will use these details only to
                enter this authorized payor in Chase.
              </label>
              <button
                type="button"
                className="button secondary"
                disabled={busy || !privateScreen}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    setDetails(
                      await reveal({
                        id: r._id,
                        confirmPrivateScreen: privateScreen,
                      }),
                    );
                    setPrivateScreen(false);
                  } catch (e) {
                    setError(message(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Temporarily view bank details
              </button>
            </>
          )}
        </section>
      ) : null}
      {r.status !== "withdrawn" ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            setDetails(null);
            try {
              await review({
                id: r._id,
                status: next,
                memberMessage: String(f.get("memberMessage")),
                verifiedAuthorization: f.get("verifiedAuthorization") === "on",
                authorizationReference:
                  String(f.get("authorizationReference") || "") || undefined,
                chasePayorReference:
                  String(f.get("chasePayorReference") || "") || undefined,
              });
              setNotice("Review saved. No payment was initiated.");
              onSaved(next);
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            <legend>Move this request to its next step</legend>
            <label>
              Next step
              <select
                value={next}
                onChange={(e) => setNext(e.target.value as AchState)}
              >
                {(Object.keys(achLabels) as AchState[])
                  .filter(
                    (s) =>
                      canTransitionAch(r.status, s) &&
                      !(role === "secretary" && s === "entered_in_chase"),
                  )
                  .map((s) => (
                    <option key={s} value={s}>
                      {achLabels[s]}
                    </option>
                  ))}
              </select>
            </label>
            {next === "ready_for_chase" ? (
              <>
                <label>
                  Authorization document reference
                  <input
                    name="authorizationReference"
                    required
                    maxLength={100}
                    placeholder="Reference in the monastery’s secure authorization records"
                  />
                </label>
                <label className="check-label">
                  <input
                    name="verifiedAuthorization"
                    type="checkbox"
                    required
                  />
                  I obtained and checked the bank-approved debit authorization,
                  account details, amount, frequency and agreed dates. The
                  website’s sharing consent is not that authorization.
                </label>
              </>
            ) : null}
            {next === "entered_in_chase" ? (
              <>
                <label>
                  Chase payor nickname or reference
                  <input name="chasePayorReference" required maxLength={100} />
                </label>
                <p>
                  Confirm only after entering the payor in Chase yourself. This
                  does not confirm a scheduled collection, settlement, or
                  payment.
                </p>
              </>
            ) : null}
            {next === "withdrawn" ? (
              <p>
                This removes stored bank details from active records. Cancel any
                existing Chase instructions separately.
              </p>
            ) : null}
            <label>
              Message visible to the member
              <textarea
                name="memberMessage"
                required
                maxLength={400}
                placeholder="Explain the next step. Never include bank numbers."
              />
            </label>
            <button className="button" disabled={busy}>
              {busy ? "Saving review…" : "Save reviewed status"}
            </button>
          </fieldset>
        </form>
      ) : null}
    </article>
  );
}
