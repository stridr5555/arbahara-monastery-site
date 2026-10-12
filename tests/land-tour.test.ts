import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { Gallery } from "../src/pages/Community";
import { LandJourney } from "../src/components/LandJourney";
import { advanceTour, tourChapter, tourChapters } from "../src/lib/landTour";

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
  });
  it("bounds progress and prevents a hidden-tab time jump", () => {
    expect(tourChapter(-1)).toBe(0);
    expect(tourChapter(NaN)).toBe(0);
    expect(tourChapter(0.25)).toBe(1);
    expect(tourChapter(0.5)).toBe(2);
    expect(tourChapter(1)).toBe(3);
    expect(advanceTour(0.2, 60)).toBeCloseTo(0.2025);
    expect(advanceTour(1, 0.1)).toBe(1);
    expect(advanceTour(0.2, -1)).toBe(0.2);
  });
});
