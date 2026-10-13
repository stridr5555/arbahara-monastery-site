/** Shared validation only. Never log or interpolate submitted bank details. */
import { BANK_SHARING_VERSION } from "../src/lib/bankConsent";
export {
  BANK_SHARING_TEXT,
  BANK_SHARING_VERSION,
} from "../src/lib/bankConsent";
export type BankDetails = {
  accountHolder: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  confirmAccountNumber: string;
  accountType: "checking" | "savings";
  ownership: "personal" | "business";
  frequency: "monthly" | "annual";
  sharingConsent: boolean;
  consentVersion: string;
};
export function validRoutingNumber(value: string) {
  if (!/^\d{9}$/.test(value) || /^0{9}$/.test(value)) return false;
  const prefix = Number(value.slice(0, 2));
  if (!(
    prefix <= 12 ||
    (prefix >= 21 && prefix <= 32) ||
    (prefix >= 61 && prefix <= 72) ||
    prefix === 80
  ))
    return false;
  const d = [...value].map(Number);
  return (
    (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + d[2] + d[5] + d[8]) %
      10 ===
    0
  );
}
export function validateBankDetails(value: unknown): BankDetails {
  if (!value || typeof value !== "object")
    throw new Error("Bank details are incomplete.");
  const d = value as BankDetails;
  for (const key of ["accountHolder", "bankName"] as const)
    if (
      typeof d[key] !== "string" ||
      !d[key].trim() ||
      d[key].length > 120 ||
      /[\r\n\x00-\x1f]/.test(d[key])
    )
      throw new Error(
        "Enter the account holder and bank name using ordinary text.",
      );
  if (
    typeof d.routingNumber !== "string" ||
    !validRoutingNumber(d.routingNumber)
  )
    throw new Error(
      "Enter a valid nine-digit ACH routing number. A checksum does not verify the bank account.",
    );
  if (
    typeof d.accountNumber !== "string" ||
    !/^\d{4,17}$/.test(d.accountNumber) ||
    /^0+$/.test(d.accountNumber)
  )
    throw new Error("Enter an account number containing 4 to 17 digits.");
  if (d.accountNumber !== d.confirmAccountNumber)
    throw new Error("The two account numbers do not match.");
  if (
    !["checking", "savings"].includes(d.accountType) ||
    !["personal", "business"].includes(d.ownership)
  )
    throw new Error("Choose an account type and ownership type.");
  if (!["monthly", "annual"].includes(d.frequency))
    throw new Error("Choose monthly or annual dues.");
  if (d.sharingConsent !== true || d.consentVersion !== BANK_SHARING_VERSION)
    throw new Error("Review and accept the bank-information sharing notice.");
  return {
    accountHolder: d.accountHolder.trim(),
    bankName: d.bankName.trim(),
    routingNumber: d.routingNumber,
    accountNumber: d.accountNumber,
    confirmAccountNumber: d.confirmAccountNumber,
    accountType: d.accountType,
    ownership: d.ownership,
    frequency: d.frequency,
    sharingConsent: true,
    consentVersion: BANK_SHARING_VERSION,
  };
}
export const achStates = [
  "submitted",
  "needs_information",
  "ready_for_chase",
  "entered_in_chase",
  "withdrawn",
] as const;
export type AchState = (typeof achStates)[number];
export function canTransitionAch(from: AchState, to: AchState) {
  return (
    {
      submitted: ["needs_information", "ready_for_chase", "withdrawn"],
      needs_information: ["ready_for_chase", "withdrawn"],
      ready_for_chase: ["needs_information", "entered_in_chase", "withdrawn"],
      entered_in_chase: ["withdrawn"],
      withdrawn: [],
    } as Record<AchState, AchState[]>
  )[from].includes(to);
}
