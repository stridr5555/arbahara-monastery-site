export type Point3 = readonly [number, number, number];
export type CameraPose = { position: Point3; target: Point3 };
export const tourDuration = 70;
export const tourChapters = [
  {
    name: "The land",
    text: "Begin above the wooded property, then descend toward the places that make it a home for our community.",
    position: [88, 86, 116],
    target: [0, -9, 0],
  },
  {
    name: "The residence",
    text: "Study the residence’s steep red-brown roof, two dormer windows, chimney and sheltered front porch, reconstructed from the property photographs.",
    position: [1, 19, 68],
    target: [-18, 5, 30],
  },
  {
    name: "The garage",
    text: "The existing two-door garage is a proposed beginning for congregational prayer. Any conversion requires professional assessment, approvals and the Church’s guidance.",
    position: [-13, 14, 73],
    target: [-34, 3, 45],
  },
  {
    name: "The lake",
    text: "Fly beyond the residence to the lake and wooded shoreline. A proposed well is separate from the lake and requires assessment, permissions and ecclesiastical guidance.",
    position: [32, 32, 23],
    target: [2, 0, -22],
  },
  {
    name: "The entrance",
    text: "Follow the curving drive back toward the eastern road and entrance. The model shows the setting, not surveyed boundaries or ownership of neighboring land.",
    position: [74, 23, 14],
    target: [49, 1, -32],
  },
] as const satisfies readonly ({ name: string; text: string } & CameraPose)[];
const clamp = (p: number) =>
  Math.min(1, Math.max(0, Number.isFinite(p) ? p : 0));
export function tourChapter(progress: number) {
  return Math.min(
    tourChapters.length - 1,
    Math.floor(clamp(progress) * tourChapters.length),
  );
}
export function chapterProgress(chapter: number) {
  return (
    (Math.min(tourChapters.length - 1, Math.max(0, chapter)) + 0.68) /
    tourChapters.length
  );
}
export function advanceTour(progress: number, elapsedSeconds: number) {
  return clamp(
    clamp(progress) +
      Math.max(
        0,
        Math.min(Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0, 0.1),
      ) /
        tourDuration,
  );
}
export const smoothFlight = (t: number) => {
  const p = clamp(t);
  return p * p * p * (p * (p * 6 - 15) + 10);
};
export function mixPoint(a: Point3, b: Point3, t: number): Point3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}
/** Translate and descend toward each subject; never rotate the land or orbit it.
 * The last 35% of each chapter is a stationary inspection stop. */
export function tourPose(progress: number, zoom = 1): CameraPose {
  const p = clamp(progress),
    chapter = tourChapter(p);
  const local = Math.min(1, p * tourChapters.length - chapter);
  const to = tourChapters[chapter];
  const from: CameraPose = chapter
    ? tourChapters[chapter - 1]
    : { position: [100, 100, 140], target: [0, -9, 0] };
  const t = smoothFlight(local / 0.65);
  const target = mixPoint(from.target, to.target, t);
  const base = mixPoint(from.position, to.position, t);
  const height = chapter ? Math.sin(t * Math.PI) * 12 : 0;
  const distance = Math.min(
    1.4,
    Math.max(0.65, Number.isFinite(zoom) ? zoom : 1),
  );
  return {
    target,
    position: [
      target[0] + (base[0] - target[0]) * distance,
      target[1] + (base[1] + height - target[1]) * distance,
      target[2] + (base[2] - target[2]) * distance,
    ],
  };
}
