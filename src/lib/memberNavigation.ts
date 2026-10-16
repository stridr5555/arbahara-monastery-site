// Preserve only public giving choices across provider sign-in, never arbitrary
// redirects, staff routes, OAuth state or account/bank identifiers.
export function memberSignInReturn(search: string) {
  const params = new URLSearchParams(search);
  if (params.get("view") !== "give") return "/members";
  const next = new URLSearchParams({ view: "give" });
  for (const key of ["amount", "fund", "frequency", "method"]) {
    const value = params.get(key);
    if (value !== null) next.set(key, value);
  }
  return `/members?${next}`;
}
