import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { ErrorMessage, message } from "../components/Live";

export type DuesAnswer = {
  answer: "" | "yes" | "no" | "unsure";
  method: "" | "zelle" | "check" | "cash";
  amount: string;
  date: string;
  coverage: string;
  reference: string;
};
export const emptyDuesAnswer: DuesAnswer = {
  answer: "",
  method: "",
  amount: "",
  date: "",
  coverage: "",
  reference: "",
};
export function duesPayload(value: DuesAnswer) {
  if (!value.answer)
    throw new Error(
      "Tell us whether you already paid family dues, or choose Not sure.",
    );
  if (value.answer === "yes" && !value.method)
    throw new Error("Choose Zelle, check, or cash.");
  if (
    value.answer === "yes" &&
    value.amount &&
    (!/^\d+(\.\d{1,2})?$/.test(value.amount) ||
      Number(value.amount) <= 0 ||
      Number(value.amount) > 1000000)
  )
    throw new Error(
      "Enter a positive payment amount with at most two decimal places.",
    );
  return {
    answer: value.answer,
    ...(value.answer === "yes"
      ? {
          method: value.method as "zelle" | "check" | "cash",
          ...(value.amount
            ? { amountCents: Math.round(Number(value.amount) * 100) }
            : {}),
          ...(value.date ? { date: value.date } : {}),
        }
      : {}),
    ...(value.answer !== "no"
      ? { coverage: value.coverage, reference: value.reference }
      : {}),
  };
}
export function AchTransition() {
  return (
    <aside className="membership-choice" aria-label="Moving to bank-based ACH">
      <h3>We are moving family dues to bank-based ACH</h3>
      <p>
        For safer, more reliable dues collection, we are moving to bank-based
        ACH: less cash handling, scheduled payments and traceable bank records.
        No payment method is risk-free.
      </p>
      <p>
        Dues remain $20 per month per family. Report past payments so the office
        can check covered months before setting your ACH start date. Do not pay
        the same months twice.
      </p>
      <p>
        Switching from monthly Zelle? After the office confirms your ACH
        authorization and start date, cancel repeating Zelle dues through your
        bank, or stop sending them manually when ACH begins. The website cannot
        cancel Zelle for you.
      </p>
      <p className="small">
        Signup alone neither starts debits nor cancels Zelle. Separate
        bank-approved authorization is required.
      </p>
      <a
        className="text-link"
        href="https://www.chase.com/business/support/banking/collect-and-deposit"
        target="_blank"
        rel="noreferrer"
      >
        How bank ACH collections work at Chase
      </a>
    </aside>
  );
}
export function DuesDeclarationFields({
  value,
  onChange,
}: {
  value: DuesAnswer;
  onChange: (value: DuesAnswer) => void;
}) {
  const set = (key: keyof DuesAnswer, next: string) =>
    onChange({ ...value, [key]: next });
  return (
    <fieldset>
      <legend>
        Have you already paid family membership dues? /{" "}
        <span lang="am">የቤተሰብ አባልነት መዋጮ ከፍለዋል?</span>
      </legend>
      <p>
        Include payments made by you or your spouse. Choose Not sure if you need
        the office to check. This will not delay your membership.
      </p>
      <label>
        Already paid? / <span lang="am">ከፍለዋል?</span>
        <select
          required
          value={value.answer}
          onChange={(e) => set("answer", e.target.value)}
        >
          <option value="">Choose an answer</option>
          <option value="yes">Yes — by Zelle, check, or cash</option>
          <option value="no">No — I have not already paid</option>
          <option value="unsure">Not sure — please help me check</option>
        </select>
      </label>
      {value.answer === "yes" ? (
        <>
          <label>
            Payment method / <span lang="am">የክፍያ ዘዴ</span>
            <select
              required
              value={value.method}
              onChange={(e) => set("method", e.target.value)}
            >
              <option value="">Choose payment method</option>
              <option value="zelle">Zelle</option>
              <option value="check">Check</option>
              <option value="cash">Cash</option>
            </select>
          </label>
          {value.method === "zelle" ? (
            <p className="notice">
              After ACH is authorized and its start date is confirmed, stop your
              monthly Zelle dues payments through your bank to avoid duplicate
              payments. Keep your previous Zelle reference for reconciliation.
            </p>
          ) : null}
          <div className="two-columns">
            <label>
              Amount paid in dollars (if known) /{" "}
              <span lang="am">የከፈሉት መጠን</span>
              <input
                inputMode="decimal"
                value={value.amount}
                maxLength={12}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="20.00 or 240.00"
              />
            </label>
            <label>
              Payment date (if known) / <span lang="am">የክፍያ ቀን</span>
              <input
                type="date"
                value={value.date}
                onInput={(e) => set("date", e.currentTarget.value)}
                onChange={(e) => set("date", e.target.value)}
              />
            </label>
          </div>
        </>
      ) : null}
      {value.answer === "yes" || value.answer === "unsure" ? (
        <>
          <label>
            Months or year covered (if known) /{" "}
            <span lang="am">የተከፈለባቸው ወራት ወይም ዓመት</span>
            <input
              value={value.coverage}
              maxLength={240}
              onChange={(e) => set("coverage", e.target.value)}
              placeholder="For example: January–December 2026, paid yearly"
            />
          </label>
          <label>
            Payment reference or details (optional) /{" "}
            <span lang="am">የክፍያ ዝርዝር</span>
            <textarea
              value={value.reference}
              maxLength={240}
              onChange={(e) => set("reference", e.target.value)}
              placeholder="Payer’s name, Zelle reference, check number, or who received cash"
            />
          </label>
          <p className="small">
            Do not enter bank account or routing numbers here. If you made
            several payments, note the other dates and methods or contact the
            office. A reported payment is not confirmed until checked against
            the monastery’s records.
          </p>
        </>
      ) : null}
    </fieldset>
  );
}
function ReportForm({ report }: { report: Doc<"duesDeclarations"> | null }) {
  const save = useMutation(api.duesReports.save);
  const [value, setValue] = useState<DuesAnswer>(() =>
    report
      ? {
          answer: report.answer,
          method: report.method || "",
          amount: report.amountCents
            ? (report.amountCents / 100).toFixed(2)
            : "",
          date: report.date || "",
          coverage: report.coverage || "",
          reference: report.reference || "",
        }
      : emptyDuesAnswer,
  );
  const [editing, setEditing] = useState(!report),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!editing && report)
    return (
      <div className="office-review" role="status">
        <h3>Your previous-dues answer is saved</h3>
        <p>
          {report.answer === "yes"
            ? "You reported dues already paid."
            : report.answer === "no"
              ? "You said you have not already paid dues."
              : "You asked the office to help check past dues."}
        </p>
        {report.method ? (
          <p>
            {report.method === "zelle"
              ? "Zelle"
              : report.method === "check"
                ? "Check"
                : "Cash"}
            {report.amountCents
              ? ` · $${(report.amountCents / 100).toFixed(2)}`
              : ""}
          </p>
        ) : null}
        {report.coverage ? <p data-no-translate>{report.coverage}</p> : null}
        <p>
          {report.status === "pending"
            ? "The office still needs to reconcile this report. Your displayed balance includes confirmed receipts only. Tell the office about this report before scheduling ACH for those months."
            : report.status === "reviewed"
              ? "The office has reviewed this report. See confirmed receipts for paid coverage; review alone does not mark a payment received."
              : "You can update this answer if you find a previous payment."}
        </p>
        <button
          className="button secondary"
          type="button"
          onClick={() => setEditing(true)}
        >
          Update my previous-dues answer
        </button>
      </div>
    );
  return (
    <form
      className="profile-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
          await save({ declaration: duesPayload(value) });
          setEditing(false);
        } catch (err) {
          setError(message(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <DuesDeclarationFields value={value} onChange={setValue} />
      <ErrorMessage message={error} />
      <button className="button secondary" disabled={busy}>
        {busy ? "Saving…" : "Save previous-dues answer"}
      </button>
    </form>
  );
}
export function DuesHistoryReport() {
  const report = useQuery(api.duesReports.mine);
  return report === undefined ? (
    <p role="status">Checking your previous-dues answer…</p>
  ) : (
    <ReportForm key={report?.updatedAt || "new"} report={report || null} />
  );
}
