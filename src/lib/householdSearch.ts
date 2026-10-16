type Contact = { name: string; email?: string; phone: string };
export function householdMatches(
  household: Contact & {
    linkedAccounts?: Contact[];
    billingContacts?: Contact[];
  },
  search: string,
) {
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[^\p{L}\p{N}@]/gu, "");
  return normalize(
    [
      household,
      ...(household.linkedAccounts || []),
      ...(household.billingContacts || []),
    ]
      .map((c) => `${c.name} ${c.email || ""} ${c.phone}`)
      .join(" "),
  ).includes(normalize(search));
}
