import { describe, expect, it } from "vitest";
import {
  calendarIcs,
  churchInstant,
  civilDate,
  ethiopianDate,
  gatheringsBetween,
  nearestSunday,
  isoDate,
} from "../src/lib/calendar";
describe("Church calendar", () => {
  it("converts Ethiopian dates without a fixed September offset", () => {
    expect(ethiopianDate(civilDate("2026-11-06"))).toEqual({
      year: 2019,
      month: 2,
      day: 27,
    });
    expect(ethiopianDate(civilDate("2026-12-06"))).toEqual({
      year: 2019,
      month: 3,
      day: 27,
    });
  });
  it("chooses the nearest Sunday including same-day gatherings", () => {
    for (const [from, to] of [
      ["2026-11-06", "2026-11-08"],
      ["2026-12-06", "2026-12-06"],
      ["2027-01-05", "2027-01-03"],
      ["2027-02-04", "2027-02-07"],
    ])
      expect(isoDate(nearestSunday(civilDate(from)))).toBe(to);
    const same = gatheringsBetween("2026-12-06", "2026-12-06");
    expect(same).toHaveLength(2);
    expect(same[0].startsAt).not.toBe(same[1].startsAt);
  });
  it("has twelve 27ths, never a Pagume 27th", () => {
    const all = gatheringsBetween("2026-09-11", "2027-09-11").filter(
      (e) => e.kind === "mahiber",
    );
    expect(all).toHaveLength(12);
    expect(new Set(all.map((e) => e.id)).size).toBe(12);
  });
  it("uses Chicago DST and includes cross-month Sunday occurrences", () => {
    expect(new Date(churchInstant("2026-07-04", 19)).toISOString()).toBe(
      "2026-07-05T00:00:00.000Z",
    );
    expect(new Date(churchInstant("2026-11-06", 19)).toISOString()).toBe(
      "2026-11-07T01:00:00.000Z",
    );
    expect(
      gatheringsBetween("2027-01-01", "2027-01-31").find(
        (e) => e.kind === "ziker",
      )?.date,
    ).toBe("2027-01-03");
  });
  it("exports stable unique UTC occurrences with octet-safe folded lines", () => {
    const text = calendarIcs(gatheringsBetween("2026-11-01", "2026-11-30"));
    expect(text).toContain("UID:arbahara-mahiber-2019-2@haramonastery.org");
    expect(text).toContain("DTSTART:20261107T010000Z");
    expect(text).not.toContain("RRULE");
    expect(
      text.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75),
    ).toBe(true);
  });
  it("rejects malformed dates and unbounded calendar generation", () => {
    expect(() => civilDate("2026-02-30")).toThrow();
    expect(() => gatheringsBetween("2026-01-01", "2030-01-01")).toThrow();
  });
});
