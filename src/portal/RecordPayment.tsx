import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ErrorMessage, message } from "../components/Live";
import { money } from "./Giving";
import { coverageMonths } from "../../convex/ledger";
import { householdMatches } from "../lib/householdSearch";
function today() {
  const p = new Intl.DateTimeFormat("en", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return `${p.find((x) => x.type === "year")!.value}-${p.find((x) => x.type === "month")!.value}-${p.find((x) => x.type === "day")!.value}`;
}
type Payment = {
  householdId?: Id<"households">;
  date: string;
  duesCents: number;
  giftCents: number;
  giftFund: "general" | "construction";
  method: "cash" | "zelle" | "ach" | "check" | "card" | "other";
  reference: string;
  requestId: string;
  firstMonth?: string;
  months: number;
};
export default function RecordPayment() {
  const households = useQuery(api.households.list),
    record = useMutation(api.finance.recordReceipt);
  const [search, setSearch] = useState(""),
    [householdId, setHouseholdId] = useState(""),
    [months, setMonths] = useState(1),
    [dues, setDues] = useState("20.00");
  const [review, setReview] = useState<Payment | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState<Payment | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const household = households?.find((h) => h._id === householdId);
  const found = households?.filter((h) => householdMatches(h, search)) || [];
  return (
    <section className="panel">
      <h2>Record a received payment</h2>
      <p>
        Use this after you have verified receipt. It records a collection in the
        ledger; it does not charge a card or debit a bank account.
      </p>
      <ol className="office-steps">
        <li>Choose the household</li>
        <li>Enter payment and coverage</li>
        <li>Review and save</li>
      </ol>
      <ErrorMessage message={error} />
      {saved ? (
        <div className="office-review" role="status">
          <h3>Payment recorded</h3>
          <p>
            {money(saved.duesCents + saved.giftCents)} ·{" "}
            <span data-no-translate>{saved.reference}</span>
          </p>
          <p>
            The collection and audit record were saved. Any dues allocation
            follows the reviewed coverage; already-covered months are skipped
            and the remainder stays unapplied.
          </p>
          <button
            className="button"
            onClick={() => {
              setSaved(null);
              setReview(null);
              setHouseholdId("");
              setSearch("");
              setMonths(1);
              setDues("20.00");
            }}
          >
            Record another payment
          </button>
        </div>
      ) : households === undefined ? (
        <p role="status">Loading households…</p>
      ) : (
        <form
          ref={form}
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (review) {
              setBusy(true);
              try {
                await record(review);
                setSaved(review);
                form.current?.reset();
              } catch (e) {
                setError(message(e));
              } finally {
                setBusy(false);
              }
              return;
            }
            try {
              const f = new FormData(e.currentTarget),
                toCents = (value: string) => {
                  if (!/^\d+(\.\d{1,2})?$/.test(value))
                    throw new Error(
                      "Enter a positive amount with at most two decimal places.",
                    );
                  const n = Math.round(Number(value) * 100);
                  if (!Number.isSafeInteger(n))
                    throw new Error("Amount is too large.");
                  return n;
                };
              const d = toCents(dues),
                gift = toCents(String(f.get("gift")));
              if (d + gift <= 0 || d + gift > 100000000)
                throw new Error(
                  "Enter a received amount greater than zero and within the collection limit.",
                );
              if (
                d > 0 &&
                (!household ||
                  household.status !== "active" ||
                  household.exempt)
              )
                throw new Error(
                  "Select an active, non-exempt household for dues.",
                );
              const first = String(f.get("firstMonth") || "");
              if (d && !first) throw new Error("Choose the first dues month.");
              if (d) coverageMonths(first, months);
              const date = String(f.get("date"));
              if (date > today())
                throw new Error("A received payment cannot be future-dated.");
              if (f.get("verified") !== "on")
                throw new Error("Confirm you checked the received payment.");
              const reference = String(f.get("reference")).trim().toUpperCase();
              if (!reference)
                throw new Error(
                  "Enter the bank transaction or cash receipt reference.",
                );
              setReview({
                householdId: householdId
                  ? (householdId as Id<"households">)
                  : undefined,
                date,
                duesCents: d,
                giftCents: gift,
                giftFund: String(f.get("giftFund")) as Payment["giftFund"],
                method: String(f.get("method")) as Payment["method"],
                reference,
                requestId: crypto.randomUUID(),
                firstMonth: d ? first : undefined,
                months: d ? months : 1,
              });
            } catch (e) {
              setError(message(e));
            }
          }}
        >
          <fieldset hidden={!!review} disabled={busy}>
            <legend>Household and received payment</legend>
            <label>
              Find the household
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email or phone"
              />
            </label>
            <label>
              Household
              <select
                value={householdId}
                onChange={(e) => setHouseholdId(e.target.value)}
              >
                <option value="">No household · gift only</option>
                {(household && !found.includes(household)
                  ? [household, ...found]
                  : found
                ).map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name} · {h.email || h.phone || h.status}
                  </option>
                ))}
              </select>
            </label>
            {household ? (
              <div>
                <p data-no-translate>
                  {household.name} · {household.phone} · {household.email}
                </p>
                <p>
                  Linked family members:{" "}
                  <span data-no-translate>
                    {household.linkedAccounts
                      .map((a) => a.name || a.email)
                      .join(" · ") || "—"}
                  </span>
                </p>
              </div>
            ) : null}
            <div className="office-form-grid">
              <label>
                Date received
                <input
                  type="date"
                  name="date"
                  defaultValue={today()}
                  max={today()}
                  required
                />
              </label>
              <label>
                Payment method
                <select name="method">
                  <option value="cash">Cash received</option>
                  <option value="zelle">Zelle verified in bank</option>
                  <option value="ach">ACH settled in bank</option>
                  <option value="check">Check deposited and verified</option>
                  <option value="card">Card settlement verified</option>
                  <option value="other">Other verified receipt</option>
                </select>
              </label>
            </div>
            <label>
              Bank transaction or cash receipt reference
              <input
                name="reference"
                required
                maxLength={150}
                placeholder="Unique reference; never enter bank account numbers"
              />
            </label>
            <div className="filter-row">
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setMonths(1);
                  setDues("20.00");
                }}
              >
                One month · $20
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setMonths(12);
                  setDues("240.00");
                }}
              >
                One year · $240
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setDues("0.00");
                  setMonths(1);
                }}
              >
                Gift only
              </button>
            </div>
            <div className="office-form-grid">
              <label>
                Dues received · USD
                <input
                  name="dues"
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.01"
                  required
                  value={dues}
                  onChange={(e) => setDues(e.target.value)}
                />
              </label>
              <label>
                Additional gift · USD
                <input
                  name="gift"
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.01"
                  required
                  defaultValue="0.00"
                />
              </label>
              <label>
                First dues month
                <input
                  name="firstMonth"
                  type="month"
                  required={Number(dues) > 0}
                  defaultValue={today().slice(0, 7)}
                  min={household?.duesStart}
                />
              </label>
              <label>
                Months to apply
                <select
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Additional gift fund
                <select name="giftFund">
                  <option value="general">General offering</option>
                  <option value="construction">Construction</option>
                </select>
              </label>
            </div>
            <p className="small">
              Partial payments are allowed. Review the actual first month with
              the member; the system does not interpret missing historical
              spreadsheet cells as unpaid dues.
            </p>
            <label className="check-label">
              <input type="checkbox" name="verified" required />I checked that
              this payment was received and that it has not already been
              recorded.
            </label>
          </fieldset>
          {review ? (
            <div className="office-review">
              <h3>Review this collection</h3>
              <dl>
                <dt>Household</dt>
                <dd data-no-translate>{household?.name || "Gift only"}</dd>
                <dt>Date and reference</dt>
                <dd data-no-translate>
                  {review.date} · {review.reference}
                </dd>
                <dt>Dues</dt>
                <dd>{money(review.duesCents)}</dd>
                <dt>Additional gift</dt>
                <dd>{money(review.giftCents)}</dd>
                <dt>Total received</dt>
                <dd>{money(review.duesCents + review.giftCents)}</dd>
                {review.duesCents ? (
                  <>
                    <dt>Requested coverage</dt>
                    <dd data-no-translate>
                      {review.firstMonth} –{" "}
                      {coverageMonths(review.firstMonth!, review.months).at(-1)}
                    </dd>
                  </>
                ) : null}
              </dl>
              <p>
                Saving creates a ledger entry. A repeated save of this same
                reviewed request will not duplicate it.
              </p>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => setReview(null)}
              >
                Go back and edit
              </button>
            </div>
          ) : null}
          <button className="button" disabled={busy}>
            {busy
              ? "Saving collection…"
              : review
                ? "Confirm and record payment"
                : "Review payment"}
          </button>
        </form>
      )}
    </section>
  );
}
