import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { Gallery } from "../src/pages/Community";
import { LandJourney } from "../src/components/LandJourney";
import {
  advanceTour,
  chapterProgress,
  tourChapter,
  tourChapters,
  tourPose,
} from "../src/lib/landTour";

describe("Accessible collection and property tour", () => {
  it("renders every collection without an accordion or category filter", () => {
    const html = renderToStaticMarkup(createElement(Gallery));
    expect(html).not.toContain("<details");
    for (const section of [
      "community-photographs",
      "property-photographs",
      "sacred-art",
      "community-films",
    ]) {
      expect(html).toContain(`id="${section}"`);
      expect(html).toContain(`href="#${section}"`);
    }
    expect(html).toContain("land-10.webp");
    expect(html).toContain("VID_20220607_230855_830.mp4");
    expect(html).toContain('preload="none"');
  });
  it("keeps all tour chapters usable without WebGL or animation", () => {
    const html = renderToStaticMarkup(createElement(LandJourney));
    for (const chapter of tourChapters) expect(html).toContain(chapter.name);
    expect(html).toContain("Animations are off");
    expect(html).toContain("Not a surveyed model or drone recording");
    expect(html).toContain("Tour progress");
    expect(html).toContain("land-illustration-accurate.webp");
    expect(html).toContain("Rooted here.");
    expect(html).toContain("Closer");
    expect(html).toContain("Wider");
    expect(html).toContain("Return to overview");
    expect(html).not.toContain("<dialog");
    expect(html).not.toContain("diorama-photo");
  });
  it("flies through space, descends toward the residence and holds for inspection", () => {
    const start = tourPose(0);
    const house = tourPose(chapterProgress(1));
    house.position.forEach((value, axis) =>
      expect(value).toBeCloseTo(tourChapters[1].position[axis], 12),
    );
    expect(house.target).toEqual(tourChapters[1].target);
    expect(house.position[1]).toBeLessThan(start.position[1]);
    expect(tourPose(0.335)).toEqual(tourPose(0.39));
    // Pausing has no independent orbit, image movement or drift.
    expect(tourPose(0.36)).toEqual(tourPose(0.36));
    expect(tourPose(NaN)).toEqual(start);
    expect(tourPose(-1)).toEqual(start);
    expect(tourPose(2)).toEqual(tourPose(1));
    for (let i = 1; i < tourChapters.length; i++) {
      const boundary = i / tourChapters.length;
      for (let axis = 0; axis < 3; axis++) {
        expect(tourPose(boundary - 0.000001).position[axis]).toBeCloseTo(
          tourPose(boundary).position[axis],
          4,
        );
        expect(tourPose(boundary - 0.000001).target[axis]).toBeCloseTo(
          tourPose(boundary).target[axis],
          4,
        );
      }
    }
    for (let i = 0; i < tourChapters.length; i++)
      expect(tourChapter(chapterProgress(i))).toBe(i);
  });
  it("dollies closer to a fixed target instead of spinning the scene", () => {
    const p = chapterProgress(2),
      wide = tourPose(p),
      close = tourPose(p, 0.65);
    expect(close.target).toEqual(wide.target);
    const distance = (pose: ReturnType<typeof tourPose>) =>
      Math.hypot(...pose.position.map((v, i) => v - pose.target[i]));
    expect(distance(close)).toBeCloseTo(distance(wide) * 0.65);
  });
  it("bounds progress and prevents a hidden-tab time jump", () => {
    expect(tourChapter(-1)).toBe(0);
    expect(tourChapter(NaN)).toBe(0);
    expect(tourChapter(0.25)).toBe(1);
    expect(tourChapter(0.5)).toBe(2);
    expect(tourChapter(1)).toBe(4);
    expect(advanceTour(0.2, 60)).toBeCloseTo(0.2 + 0.1 / 70);
    expect(advanceTour(1, 0.1)).toBe(1);
    expect(advanceTour(0.2, -1)).toBe(0.2);
  });
});
