export const tourDuration = 40;
export const tourChapters = [
  {
    name: "The land",
    image: "/assets/property/user-map-oblique.jpg",
    alt: "Original aerial photograph of the Crandall property and lake",
    text: "Ten acres in Crandall, Texas. A place to gather, serve and grow.",
  },
  {
    name: "The residence",
    image: "/assets/property/land-02.webp",
    alt: "Original aerial photograph of the existing residence",
    text: "An existing residence and garage offer a beginning. Preparing a place for congregational prayer requires professional review and the Church’s guidance.",
  },
  {
    name: "The lake",
    image: "/assets/property/user-map-overhead.jpg",
    alt: "Original overhead photograph showing the existing lake",
    text: "A peaceful lake at the heart of the land. A proposed aquifer well requires assessment, permissions and ecclesiastical guidance before drilling or sacred use.",
  },
  {
    name: "The vision",
    image: "/assets/images/monastery-campus-master-plan.png",
    alt: "Conceptual campus master plan, not approved construction drawings",
    text: "A home for future generations. This campus plan is a future concept—not completed buildings, surveyed locations or approved construction drawings.",
  },
] as const;
export function tourChapter(progress: number) {
  return Math.min(
    3,
    Math.max(0, Math.floor((Number.isFinite(progress) ? progress : 0) * 4)),
  );
}
export function advanceTour(progress: number, elapsedSeconds: number) {
  return Math.min(
    1,
    Math.max(0, progress) +
      Math.max(0, Math.min(elapsedSeconds, 0.1)) / tourDuration,
  );
}
