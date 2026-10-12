export const constructionProjects = [
  ["Fire emergency water tank", 10000],
  ["Septic tank", 35000],
  ["Public bathrooms — men and women", 90000],
  ["Temporary liturgy temple", 350000],
  ["Entrance road and 50-space parking", 90000],
  ["Aquifer well", 27000],
  ["Holy water baptismal rooms", 50000],
  ["Cross water fountain", 2000],
  ["Lake safety fence", 2500],
  ["Clean the lake", 35000],
  ["Three cows", 9000],
  ["Tractor lawn mower", 5000],
  ["Seventy fruit trees", 7000],
  ["Fifteen park benches", 9750],
  ["Ten holy icons", 5000],
  ["Seven Persian rugs", 14000],
  ["Relocate two priests from Ethiopia", 12000],
  ["Temporary prayer house", 5000],
  ["40-room temporary dormitory", 400000],
] as const;
export const constructionTotal = constructionProjects.reduce(
  (sum, [, amount]) => sum + amount,
  0,
);
export const constructionSource =
  "https://docs.google.com/document/d/1tjgx6bocChiJrAoiPlwG5RGTgSLA2xSnm1KizkhPlGc/edit";
