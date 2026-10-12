import { describe, it, expect } from "vitest";
import {
  approvalStart,
  coverageMonths,
  reverseLines,
  summarizeJournals,
  validateJournal,
} from "../convex/ledger";
const lines = [
  { account: "1000", fund: "membership", debitCents: 24000, creditCents: 0 },
  { account: "2100", fund: "membership", debitCents: 0, creditCents: 24000 },
];
describe("Household dues and double-entry rules", () => {
  it("starts next Gregorian month in the church timezone", () => {
    expect(approvalStart(Date.parse("2026-11-01T00:30:00Z"))).toBe("2026-11");
    expect(coverageMonths("2026-11", 12)).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
      "2027-04",
      "2027-05",
      "2027-06",
      "2027-07",
      "2027-08",
      "2027-09",
      "2027-10",
    ]);
  });
  it("requires balanced cents, valid accounts, and balanced funds", () => {
    expect(validateJournal(lines).debitCents).toBe(24000);
    expect(() =>
      validateJournal([{ ...lines[0], debitCents: 23999 }, lines[1]]),
    ).toThrow("balance");
    expect(() =>
      validateJournal([{ ...lines[0], debitCents: 1.1 }, lines[1]]),
    ).toThrow("integer");
    expect(() =>
      validateJournal([lines[0], { ...lines[1], fund: "construction" }]),
    ).toThrow("fund");
    expect(() =>
      validateJournal([{ ...lines[0], account: "made-up" }, lines[1]]),
    ).toThrow("Unknown");
  });
  it("reverses without erasing history and does not count transfers as revenue", () => {
    const entries = [
      { date: "2026-10-12", lines },
      { date: "2026-10-13", lines: reverseLines(lines) },
    ];
    expect(
      summarizeJournals(entries, "2026-10-13").every(
        (a) => a.balanceCents === 0,
      ),
    ).toBe(true);
    expect(
      summarizeJournals([entries[0]], "2026-10-12").find(
        (a) => a.code === "4000",
      )?.balanceCents,
    ).toBe(0);
  });
});
