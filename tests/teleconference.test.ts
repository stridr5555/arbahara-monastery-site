import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ChurchCalendar,
  GatheringDetails,
} from "../src/components/ChurchCalendar";
import { Monastery, Visit } from "../src/pages/Community";
import { Amharic } from "../src/pages/Information";
import { gatheringsBetween } from "../src/lib/calendar";
import { teleconference } from "../src/lib/teleconference";

describe("Public teleconference contact", () => {
  for (const [name, Component] of [
    ["calendar", ChurchCalendar],
    ["monastery", Monastery],
    ["contact", Visit],
    ["Amharic welcome", Amharic],
  ] as const) {
    it(`publishes a correctly labeled dial link on the ${name} page`, () => {
      const html = renderToStaticMarkup(createElement(Component));
      expect(html).toContain(teleconference.number);
      expect(html).toContain(`href="${teleconference.href}"`);
      expect(html).toContain('lang="am"');
    });
  }
  it("preserves office location updates alongside the Mahiber dial-in", () => {
    const event = gatheringsBetween("2026-11-01", "2026-11-30").find(
      (e) => e.kind === "mahiber",
    )!;
    const html = renderToStaticMarkup(
      createElement(GatheringDetails, {
        event: { ...event, location: "Office update: special arrangements" },
      }),
    );
    expect(html).toContain("Office update: special arrangements");
    expect(html).toContain(teleconference.number);
  });
});
