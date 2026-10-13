import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { CHART, coverageMonths, type JournalLine } from "../../convex/ledger";
import { ErrorMessage, message } from "../components/Live";
import { downloadCsv } from "../lib/spreadsheet";
import { money } from "./Giving";
import { RosterImport } from "./RosterImport";
import { BankActivity } from "./BankActivity";
function localDate() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}
export default function FinanceAdmin({
  role,
  initialTab = "overview",
  hideNavigation = false,
}: {
  role: string;
  initialTab?: string;
  hideNavigation?: boolean;
}) {
  const [tab, setTab] = useState(initialTab),
    [through, setThrough] = useState(localDate),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const data = useQuery(api.finance.dashboard, { through }),
    households = useQuery(api.households.list);
  const post = useMutation(api.finance.post),
    approve = useMutation(api.households.approve),
    create = useMutation(api.households.create),
    record = useMutation(api.finance.recordReceipt),
    reverse = useMutation(api.finance.reverse),
    reverseReceipt = useMutation(api.finance.reverseReceipt),
    allocateUnapplied = useMutation(api.finance.allocateUnapplied),
    close = useMutation(api.finance.closePeriod),
    link = useMutation(api.households.linkAccount),
    invite = useMutation(api.households.inviteStaff);
  const [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [months, setMonths] = useState(1),
    [firstMonth, setFirstMonth] = useState("");
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice("Saved. The audit trail has been updated.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const tabs = [
    ["overview", "Overview"],
    ["households", "Households"],
    ["collections", "Collections & dues"],
    ["bank", "Bank reconciliation"],
    ["journals", "Journals"],
    ["reports", "Financial statements"],
    ["periods", "Period close"],
    ["imports", "Spreadsheet imports"],
    ...(role === "admin" ? [["access", "Staff invitations"]] : []),
  ];
  const sum = (kind: string) =>
    data?.balances
      .filter((a) => a.kind === kind)
      .reduce((s, a) => s + a.balanceCents, 0) || 0;
  const netAssets = -sum("equity") - sum("income") - sum("expense");
  const submit = (
    e: FormEvent<HTMLFormElement>,
    handler: (f: FormData) => Promise<unknown>,
  ) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(() => handler(f));
  };
  return (
    <section className="panel finance-admin">
      <h2>Stewardship & accounts</h2>
      <p>
        One household ledger, an immutable double-entry journal, and a clear
        path from collection to reconciliation. Only reconciled collections
        belong here; a member report is not proof of payment.
      </p>
      {!hideNavigation ? (
        <div className="filter-row finance-tabs">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              aria-pressed={tab === key}
              onClick={() => {
                setTab(key);
                setError("");
                setNotice("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      <ErrorMessage message={error} />
      {notice ? <p role="status">{notice}</p> : null}
      {tab === "bank" ? <BankActivity role={role} /> : null}
      {tab === "overview" ? (
        <>
          <label>
            Balances through
            <input
              type="date"
              required
              value={through}
              onChange={(e) => {
                if (e.target.value) setThrough(e.target.value);
              }}
            />
          </label>
          <div className="finance-summary">
            {[
              [
                "Bank balance",
                data?.balances.find((a) => a.code === "1000")?.balanceCents ||
                  0,
              ],
              [
                "Dues receivable",
                data?.balances.find((a) => a.code === "1100")?.balanceCents ||
                  0,
              ],
              [
                "Unapplied collections",
                -(
                  data?.balances.find((a) => a.code === "2100")?.balanceCents ||
                  0
                ),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{money(Number(value))}</strong>
              </div>
            ))}
          </div>
          <p className="small">
            Balances are from posted journals, not a live Chase connection.
            Opening balances must be reviewed and posted before these become
            complete financial statements. Future-dated dues entries are
            excluded until their period begins.
          </p>
          <h3>Funds are not separate bank accounts.</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Fund</th>
                  <th>Bank portion</th>
                  <th>Recognized income</th>
                </tr>
              </thead>
              <tbody>
                {data?.fundBalances.map((f) => (
                  <tr key={f.fund}>
                    <td>{f.fund}</td>
                    <td>{money(f.bankCents)}</td>
                    <td>{money(f.incomeCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bank-pending">
            <h3>Bank connections</h3>
            <p>
              Manual Chase setup requests are reviewed in Bank setup. Direct
              JPMorgan API debit origination is not enabled. Check Bank activity
              for the actual Plaid configuration and connection status. Ledger
              figures are not a live bank balance or proof of settlement.
            </p>
          </div>
        </>
      ) : null}
      {tab === "households" ? (
        <>
          <h3>Household roster</h3>
          <p>
            Imported and offline households do not need an online account.
            Review possible duplicates before approval. Approval creates future
            $20 monthly charges beginning next Gregorian month; it never
            rewrites historical dues.
          </p>
          <label>
            Search households
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button
            className="text-button"
            onClick={() =>
              downloadCsv("arbahara-households.csv", [
                [
                  "Name",
                  "Email",
                  "Phone",
                  "Address",
                  "Status",
                  "Exempt",
                  "Dues start",
                  "Source row",
                ],
                ...(households || []).map((h) => [
                  h.name,
                  h.email,
                  h.phone,
                  h.address,
                  h.status,
                  h.exempt,
                  h.duesStart,
                  h.sourceRow,
                ]),
              ])
            }
          >
            Export roster CSV
          </button>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Household</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {households
                  ?.filter((h) =>
                    `${h.name} ${h.email || ""} ${h.phone}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((h) => (
                    <tr key={h._id}>
                      <td data-no-translate>
                        {h.name}
                        <small>{h.sourceRow || h.source}</small>
                      </td>
                      <td data-no-translate>
                        {h.email}
                        <small>{h.phone}</small>
                      </td>
                      <td>
                        {h.exempt ? "Exempt · " : ""}
                        {h.status}
                        <small>
                          {h.duesStart
                            ? `Dues from ${h.duesStart}`
                            : "No charges yet"}
                        </small>
                      </td>
                      <td>
                        {!h.approvedAt &&
                        h.status === "pending" &&
                        role !== "treasurer" ? (
                          <button
                            className="text-button"
                            disabled={busy}
                            onClick={() =>
                              void run(() => approve({ id: h._id }))
                            }
                          >
                            Approve household
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <details>
            <summary>Add an offline household</summary>
            <form
              className="finance-form"
              onSubmit={(e) =>
                submit(e, (f) =>
                  create({
                    name: String(f.get("name")),
                    email: String(f.get("email")) || undefined,
                    phone: String(f.get("phone")),
                    address: String(f.get("address")),
                    exempt: f.get("exempt") === "on",
                  }),
                )
              }
            >
              <label>
                Household name
                <input name="name" required maxLength={120} />
              </label>
              <label>
                Email (optional)
                <input name="email" type="email" />
              </label>
              <label>
                Phone
                <input name="phone" maxLength={40} />
              </label>
              <label>
                Address
                <input name="address" maxLength={500} />
              </label>
              <label className="check-label">
                <input name="exempt" type="checkbox" />
                Explicitly exempt from dues
              </label>
              <button className="button" disabled={busy}>
                Create pending household
              </button>
            </form>
          </details>
          {role !== "treasurer" ? (
            <details>
              <summary>
                Link a verified account to an existing household
              </summary>
              <form
                className="finance-form"
                onSubmit={(e) =>
                  submit(e, (f) =>
                    link({
                      id: String(f.get("household")) as Id<"households">,
                      email: String(f.get("email")),
                      reviewPendingApplication:
                        f.get("reviewApplication") === "on",
                    }),
                  )
                }
              >
                <label>
                  Household
                  <select name="household" required>
                    <option value="">Choose household</option>
                    {households?.map((h) => (
                      <option key={h._id} value={h._id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Verified account email
                  <input name="email" type="email" required />
                </label>
                <label className="check-label">
                  <input type="checkbox" name="reviewApplication" />I reviewed
                  this person’s existing household/spouse relationship. If their
                  account has only an unapproved application with no financial
                  history, consolidate it into the selected household.
                </label>
                <p>
                  No automatic financial merging. Approved households or
                  applications with collections/charges require a separate
                  accountant review.
                </p>
                <button className="button" disabled={busy}>
                  Link reviewed account
                </button>
              </form>
            </details>
          ) : null}
        </>
      ) : null}
      {tab === "collections" ? (
        <>
          <h3>Record a verified collection</h3>
          <p>
            Cash, Zelle, ACH and check entries record money already received.
            This form never initiates a charge. Stripe card gifts remain in
            Giving history; automated processor-to-general-ledger posting is not
            enabled yet. Reconcile those settlements separately and avoid
            counting a payout as another gift.
          </p>
          <form
            className="finance-form"
            onSubmit={(e) =>
              submit(e, (f) =>
                record({
                  householdId: String(f.get("household"))
                    ? (String(f.get("household")) as Id<"households">)
                    : undefined,
                  date: String(f.get("date")),
                  duesCents: Math.round(Number(f.get("dues")) * 100),
                  giftCents: Math.round(Number(f.get("gift")) * 100),
                  giftFund: f.get("fund") as "general" | "construction",
                  method: f.get("method") as
                    "cash" | "zelle" | "ach" | "check" | "other",
                  reference: String(f.get("reference")),
                  requestId: crypto.randomUUID(),
                  months,
                  firstMonth: firstMonth || undefined,
                }),
              )
            }
          >
            <label>
              Household (required for dues)
              <select name="household">
                <option value="">Optional gift without household</option>
                {households?.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                    {h.exempt ? " · Exempt" : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="two-columns">
              <label>
                Collection date
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={localDate()}
                />
              </label>
              <label>
                Method
                <select name="method">
                  {["cash", "zelle", "ach", "check", "other"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label>
                Membership portion (USD)
                <input
                  name="dues"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="20"
                  required
                />
              </label>
              <label>
                Extra gift (USD)
                <input
                  name="gift"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  required
                />
              </label>
              <label>
                Gift fund
                <select name="fund">
                  <option value="general">General</option>
                  <option value="construction">Construction</option>
                </select>
              </label>
              <label>
                Bank or receipt reference
                <input name="reference" required maxLength={150} />
              </label>
              <label>
                Coverage period
                <select
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                >
                  <option value={1}>One month</option>
                  <option value={12}>Rolling 12 months</option>
                  <option value={24}>24 months</option>
                </select>
              </label>
              <label>
                First coverage month (blank = oldest outstanding)
                <input
                  type="month"
                  value={firstMonth}
                  onChange={(e) => setFirstMonth(e.target.value)}
                />
              </label>
            </div>
            {firstMonth ? (
              <p>Preview: {coverageMonths(firstMonth, months).join(" · ")}</p>
            ) : null}
            <p className="small">
              Partial amounts are allocated up to the amount actually collected.
              Excess dues stay unapplied, not converted to gifts. Annual dues
              are $240; separate additional giving explicitly.
            </p>
            <button className="button" disabled={busy}>
              Record verified collection
            </button>
          </form>
          <h3>Recent collections</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Method</th>
                  <th>Dues</th>
                  <th>Extra gift</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {data?.receipts.map((r) => (
                  <tr key={r._id}>
                    <td>{r.date}</td>
                    <td data-no-translate>{r.reference}</td>
                    <td>{r.method}</td>
                    <td>{money(r.duesCents)}</td>
                    <td>{money(r.giftCents)}</td>
                    <td>
                      {r.unappliedCents > 0 ? (
                        <details>
                          <summary>
                            Allocate {money(r.unappliedCents)} unapplied dues
                          </summary>
                          <form
                            onSubmit={(e) =>
                              submit(e, (f) =>
                                allocateUnapplied({
                                  id: r._id,
                                  firstMonth: String(f.get("month")),
                                  months: Number(f.get("months")),
                                }),
                              )
                            }
                          >
                            <label>
                              First coverage month
                              <input type="month" name="month" required />
                            </label>
                            <label>
                              Coverage length
                              <select name="months">
                                <option value="1">One month</option>
                                <option value="12">Twelve months</option>
                                <option value="24">Twenty-four months</option>
                              </select>
                            </label>
                            <p>
                              Only the remaining dues portion is applied.
                              Existing covered months are skipped. New
                              allocations post today or at the future coverage
                              period; closed periods are never rewritten.
                            </p>
                            <button disabled={busy}>
                              Apply reviewed coverage
                            </button>
                          </form>
                        </details>
                      ) : null}
                      {r.reversedBy ? (
                        "Reversed"
                      ) : (
                        <details>
                          <summary>Reverse collection</summary>
                          <form
                            onSubmit={(e) =>
                              submit(e, (f) =>
                                reverseReceipt({
                                  id: r._id,
                                  date: String(f.get("date")),
                                  reason: String(f.get("reason")),
                                }),
                              )
                            }
                          >
                            <input
                              type="date"
                              name="date"
                              aria-label="Reversal date"
                              defaultValue={localDate()}
                              required
                            />
                            <input
                              name="reason"
                              aria-label="Reversal reason"
                              required
                              maxLength={400}
                            />
                            <button disabled={busy}>Post reversal</button>
                          </form>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {tab === "journals" ? (
        <>
          <JournalForm busy={busy} onPost={(a) => run(() => post(a))} />
          <h3>Recent journals · includes scheduled future dues</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Debits / credits</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {data?.journals.map((j) => (
                  <tr key={j._id}>
                    <td>{j.date}</td>
                    <td>
                      {j.description}
                      <small data-no-translate>{j.reference}</small>
                    </td>
                    <td>
                      {money(j.lines.reduce((s, l) => s + l.debitCents, 0))}
                    </td>
                    <td>
                      <details>
                        <summary>View journal</summary>
                        <ul>
                          {j.lines.map((l, i) => (
                            <li key={i}>
                              {l.account} · {l.fund} · Dr {money(l.debitCents)}{" "}
                              / Cr {money(l.creditCents)}
                            </li>
                          ))}
                        </ul>
                        {j.reversedBy ? (
                          <p>Reversed · original retained</p>
                        ) : j.requestId.startsWith("manual:") ? (
                          <form
                            onSubmit={(e) =>
                              submit(e, (f) =>
                                reverse({
                                  id: j._id,
                                  date: String(f.get("date")),
                                  reason: String(f.get("reason")),
                                }),
                              )
                            }
                          >
                            <input
                              type="date"
                              name="date"
                              aria-label="Reversal date"
                              defaultValue={localDate()}
                              required
                            />
                            <input
                              name="reason"
                              aria-label="Reason"
                              required
                              maxLength={400}
                            />
                            <button disabled={busy}>Post reversal</button>
                          </form>
                        ) : (
                          <p>
                            Reverse through the source workflow, not by editing
                            this journal.
                          </p>
                        )}
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {tab === "reports" ? (
        <>
          <h3>Financial statements</h3>
          <label>
            As of
            <input
              type="date"
              required
              value={through}
              onChange={(e) => {
                if (e.target.value) setThrough(e.target.value);
              }}
            />
          </label>
          <p>
            Accrual-basis views of the posted ledger. Review opening balances,
            classifications and fund restrictions with the monastery’s
            accountant before relying on these as official statements.
          </p>
          <div className="finance-summary">
            <div>
              Assets<strong>{money(sum("asset"))}</strong>
            </div>
            <div>
              Liabilities<strong>{money(-sum("liability"))}</strong>
            </div>
            <div>
              Net assets<strong>{money(netAssets)}</strong>
            </div>
            <div>
              Income<strong>{money(-sum("income"))}</strong>
            </div>
            <div>
              Expenses<strong>{money(sum("expense"))}</strong>
            </div>
          </div>
          <p>
            Balance check: Assets − liabilities − net assets ={" "}
            <strong>
              {money(sum("asset") + sum("liability") - netAssets)}
            </strong>
          </p>
          <button
            className="text-button"
            onClick={() =>
              downloadCsv(`arbahara-trial-balance-${through}.csv`, [
                ["Account", "Name", "Type", "Debit", "Credit"],
                ...(data?.balances || []).map((a) => [
                  a.code,
                  a.name,
                  a.kind,
                  Math.max(0, a.balanceCents) / 100,
                  Math.max(0, -a.balanceCents) / 100,
                ]),
              ])
            }
          >
            Export trial balance CSV
          </button>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Debit</th>
                  <th>Credit</th>
                </tr>
              </thead>
              <tbody>
                {data?.balances.map((a) => (
                  <tr key={a.code}>
                    <td>{a.code}</td>
                    <td>{a.name}</td>
                    <td>{a.kind}</td>
                    <td>{money(Math.max(0, a.balanceCents))}</td>
                    <td>{money(Math.max(0, -a.balanceCents))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {tab === "periods" ? (
        <>
          <h3>Close a reconciled month</h3>
          <p>
            Closing prevents new journals dated in that month. Corrections use
            documented adjusting entries in an open period. Secretary accounts
            cannot close periods.
          </p>
          {role !== "secretary" ? (
            <form
              className="finance-form"
              onSubmit={(e) =>
                submit(e, (f) =>
                  close({
                    month: String(f.get("month")),
                    confirm: f.get("confirm") === "on",
                  }),
                )
              }
            >
              <label>
                Completed month
                <input type="month" name="month" required />
              </label>
              <label className="check-label">
                <input type="checkbox" name="confirm" required />I have
                reconciled bank/cash, reviewed allocations and financial
                statements, and approved the close.
              </label>
              <button className="button" disabled={busy}>
                Close month
              </button>
            </form>
          ) : null}
          <ul>
            {data?.periods.map((p) => (
              <li key={p._id}>
                {p.month} · closed {new Date(p.closedAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {tab === "imports" ? <RosterImport role={role} /> : null}
      {tab === "access" && role === "admin" ? (
        <>
          <h3>Invite the secretary or treasury team</h3>
          <p>
            The invitation activates only after that exact email is verified at
            sign-in. A secretary can review households and collections but
            cannot grant roles or close periods. This does not send an email
            automatically; share the sign-in link with the invited person.
          </p>
          <form
            className="finance-form"
            onSubmit={(e) =>
              submit(e, (f) =>
                invite({
                  email: String(f.get("email")),
                  role: f.get("role") as "secretary" | "treasurer" | "checkin",
                }),
              )
            }
          >
            <label>
              Invited email
              <input type="email" name="email" required />
            </label>
            <label>
              Role
              <select name="role">
                <option value="secretary">Secretary + treasury</option>
                <option value="treasurer">Treasurer</option>
                <option value="checkin">Event check-in</option>
              </select>
            </label>
            <button className="button" disabled={busy}>
              Save verified-email invitation
            </button>
          </form>
          <StaffInvitations />
        </>
      ) : null}
    </section>
  );
}
function JournalForm({
  busy,
  onPost,
}: {
  busy: boolean;
  onPost: (a: {
    date: string;
    description: string;
    reference: string;
    requestId: string;
    lines: JournalLine[];
  }) => Promise<void>;
}) {
  const [lines, setLines] = useState<JournalLine[]>([
    { account: "1000", fund: "general", debitCents: 0, creditCents: 0 },
    { account: "4100", fund: "general", debitCents: 0, creditCents: 0 },
  ]);
  function update(i: number, change: Partial<JournalLine>) {
    setLines((old) => old.map((l, n) => (n === i ? { ...l, ...change } : l)));
  }
  return (
    <form
      className="finance-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void onPost({
          date: String(f.get("date")),
          description: String(f.get("description")),
          reference: String(f.get("reference")),
          requestId: crypto.randomUUID(),
          lines,
        });
      }}
    >
      <h3>Post a balanced journal</h3>
      <p>
        Use for reviewed opening balances, bills/payables, expenses, processing
        fees and transfers. A Stripe payout debits bank and credits Stripe
        clearing; it is not new income.
      </p>
      <div className="two-columns">
        <label>
          Date
          <input name="date" type="date" defaultValue={localDate()} required />
        </label>
        <label>
          Reference
          <input name="reference" maxLength={150} required />
        </label>
      </div>
      <label>
        Description
        <input name="description" maxLength={500} required />
      </label>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Fund</th>
              <th>Debit (USD)</th>
              <th>Credit (USD)</th>
              <th>Line</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>
                  <select
                    aria-label={`Account line ${i + 1}`}
                    value={l.account}
                    onChange={(e) => update(i, { account: e.target.value })}
                  >
                    {CHART.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} · {a.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    aria-label={`Fund line ${i + 1}`}
                    value={l.fund}
                    onChange={(e) => update(i, { fund: e.target.value })}
                  >
                    {["general", "membership", "construction"].map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    aria-label={`Debit line ${i + 1}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={l.debitCents / 100}
                    onChange={(e) =>
                      update(i, {
                        debitCents: Math.round(Number(e.target.value) * 100),
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`Credit line ${i + 1}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={l.creditCents / 100}
                    onChange={(e) =>
                      update(i, {
                        creditCents: Math.round(Number(e.target.value) * 100),
                      })
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    disabled={lines.length <= 2}
                    onClick={() =>
                      setLines((old) => old.filter((_, n) => n !== i))
                    }
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="actions">
        <button
          type="button"
          className="text-button"
          onClick={() =>
            setLines((old) => [
              ...old,
              {
                account: "5000",
                fund: "general",
                debitCents: 0,
                creditCents: 0,
              },
            ])
          }
        >
          Add journal line
        </button>
        <span>
          Difference:{" "}
          {money(lines.reduce((s, l) => s + l.debitCents - l.creditCents, 0))}
        </span>
        <button className="button" disabled={busy}>
          Post immutable journal
        </button>
      </div>
    </form>
  );
}
function StaffInvitations() {
  const rows = useQuery(api.households.staffInvites),
    revoke = useMutation(api.households.revokeInvitation);
  const [error, setError] = useState("");
  return (
    <>
      <ErrorMessage message={error} />
      <ul>
        {rows?.map((r) => (
          <li key={r._id}>
            {r.email} · {r.role} ·{" "}
            {r.revokedAt ? (
              "Revoked"
            ) : (
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    await revoke({ id: r._id });
                  } catch (e) {
                    setError(message(e));
                  }
                }}
              >
                Revoke invitation
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
