// Changing any disclosure requires a new version. No sender is implemented here.
const common = {
  version: "2026-10-25-v1",
  sender: "+18668276926",
  source: "https://www.haramonastery.org/sms",
  privacyUrl: "https://www.haramonastery.org/privacy",
  termsUrl: "https://www.haramonastery.org/terms",
} as const;

const ending =
  "Message frequency varies. Message and data rates may apply. Reply STOP to cancel or HELP for help. For support, contact support@haramonastery.org or call 214-803-1347. SMS consent is optional and is not required for membership, donations, purchases, or other services. I have read the Privacy Policy and SMS terms linked below.";
export const smsPrograms = {
  informational: {
    ...common,
    id: "informational",
    title: "Membership and meeting notices",
    disclosure:
      "I agree to receive text messages from the Monastery of Abuna Hara Dengeel at the mobile number I provide about membership meetings and announcements, monthly meeting reminders, and membership dues reminders. " +
      ending,
  },
  fundraising: {
    ...common,
    id: "fundraising",
    title: "Donation and fundraising reminders",
    disclosure:
      "I agree to receive donation and fundraising reminder text messages from the Monastery of Abuna Hara Dengeel at the mobile number I provide. This choice is separate from membership and meeting notices. " +
      ending,
  },
} as const;
export type SmsProgramId = keyof typeof smsPrograms;

export function smsPhone(value: string) {
  if (value.length > 40)
    throw new Error("Enter a valid US or Canadian mobile number.");
  const digits = value.trim().replace(/[\s().-]/g, "");
  const phone = /^\d{10}$/.test(digits)
    ? `+1${digits}`
    : /^1\d{10}$/.test(digits)
      ? `+${digits}`
      : digits;
  if (!/^\+1[2-9]\d{2}[2-9]\d{6}$/.test(phone))
    throw new Error("Enter a valid US or Canadian mobile number.");
  return phone;
}
