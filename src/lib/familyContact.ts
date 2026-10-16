export const FAMILY_CONSENT_VERSION = "family-sharing-v1";
export const FAMILY_CONSENT =
  "I confirm this person is my spouse and agree to share our household membership, address, dues coverage and household payment records. Personal giving history, passwords, staff permissions and full bank account details remain separate. General family dues are $20 per month total, not $20 per spouse; office-approved exemptions remain in effect. Existing separate financial records or payment instructions require office review before consolidation.";
export function familyContact(kind: "email" | "phone", raw: string) {
  const value = raw.trim();
  if (value.length > 254) throw new Error("Please shorten the spouse contact.");
  if (kind === "email") {
    const email = value.toLowerCase();
    if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      throw new Error("Enter your spouse’s sign-in email address.");
    return email;
  }
  if (!/^\+?[\d ().-]+$/.test(value))
    throw new Error(
      "Enter a phone number with its country code, or a ten-digit US number.",
    );
  const digits = value.replace(/\D/g, "");
  if (!value.startsWith("+") && digits.length === 10) return `+1${digits}`;
  if (
    (!value.startsWith("+") &&
      !(digits.length === 11 && digits.startsWith("1"))) ||
    !/^[1-9]\d{7,14}$/.test(digits)
  )
    throw new Error(
      "Enter a phone number with its country code, or a ten-digit US number.",
    );
  return `+${digits}`;
}
