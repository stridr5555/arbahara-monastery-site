/** Pure accounting rules shared by server, review forms and tests. All money is integer cents. */
export const CHART = [
  { code: "1000", name: "Chase operating bank", kind: "asset" },
  { code: "1010", name: "Cash on hand", kind: "asset" },
  { code: "1020", name: "Stripe clearing", kind: "asset" },
  { code: "1100", name: "Membership receivables", kind: "asset" },
  { code: "1500", name: "Property and equipment", kind: "asset" },
  { code: "2000", name: "Accounts payable", kind: "liability" },
  { code: "2100", name: "Unapplied member collections", kind: "liability" },
  { code: "3000", name: "Opening net assets", kind: "equity" },
  { code: "4000", name: "Membership dues", kind: "income" },
  { code: "4100", name: "Donations", kind: "income" },
  { code: "5000", name: "Ministry and operating expense", kind: "expense" },
  { code: "5100", name: "Payment processing fees", kind: "expense" },
  { code: "5200", name: "Construction expense", kind: "expense" },
] as const;
export const LEDGER_FUNDS = ["general", "membership", "construction"] as const;
export type JournalLine = {
  account: string;
  fund: string;
  debitCents: number;
  creditCents: number;
};
export function cents(value: number, allowZero = false) {
  if (
    !Number.isSafeInteger(value) ||
    value < (allowZero ? 0 : 1) ||
    value > 10000000000
  )
    throw new Error("Use a valid positive amount in integer cents.");
  return value;
}
export function validMonth(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new Error("Use a Gregorian month YYYY-MM.");
  return month;
}
export function validDate(date: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw new Error("Use a valid Gregorian date.");
  return date;
}
export function shiftMonth(month: string, count: number) {
  validMonth(month);
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1 + count, 1)).toISOString().slice(0, 7);
}
export function approvalStart(now: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return shiftMonth(`${parts.year}-${parts.month}`, 1);
}
export function coverageMonths(first: string, count: number) {
  validMonth(first);
  if (!Number.isInteger(count) || count < 1 || count > 24)
    throw new Error("Select 1–24 months.");
  return Array.from({ length: count }, (_, i) => shiftMonth(first, i));
}
export function validateJournal(lines: JournalLine[]) {
  if (lines.length < 2 || lines.length > 100)
    throw new Error("A journal requires 2–100 lines.");
  let debit = 0,
    credit = 0;
  const fundTotals = new Map<string, number>();
  for (const line of lines) {
    if (!CHART.some((a) => a.code === line.account))
      throw new Error("Unknown chart-of-accounts code.");
    if (!LEDGER_FUNDS.some((f) => f === line.fund))
      throw new Error("Unknown fund.");
    cents(line.debitCents, true);
    cents(line.creditCents, true);
    if (line.debitCents > 0 === line.creditCents > 0)
      throw new Error("Each line must have either a debit or a credit.");
    debit += line.debitCents;
    credit += line.creditCents;
    fundTotals.set(
      line.fund,
      (fundTotals.get(line.fund) || 0) + line.debitCents - line.creditCents,
    );
  }
  if (!Number.isSafeInteger(debit) || debit !== credit)
    throw new Error("Debits and credits must balance.");
  if ([...fundTotals.values()].some((n) => n !== 0))
    throw new Error(
      "Each fund must balance. Record an explicit inter-fund transfer.",
    );
  return { debitCents: debit, creditCents: credit };
}
export function reverseLines(lines: JournalLine[]) {
  return lines.map((l) => ({
    ...l,
    debitCents: l.creditCents,
    creditCents: l.debitCents,
  }));
}
export function summarizeJournals(
  journals: { date: string; lines: JournalLine[] }[],
  through: string,
) {
  validDate(through);
  const balances = new Map<string, number>();
  for (const j of journals)
    if (j.date <= through)
      for (const l of j.lines)
        balances.set(
          l.account,
          (balances.get(l.account) || 0) + l.debitCents - l.creditCents,
        );
  return CHART.map((a) => ({ ...a, balanceCents: balances.get(a.code) || 0 }));
}
