import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import catalog from "../src/i18n/am.json";
import { createTranslator, languageLocale } from "../src/lib/translation";
import { eventDate } from "../src/portal/Tickets";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Amharic } from "../src/pages/Information";
const translate = createTranslator(catalog);

describe("Complete Amharic interface", () => {
  it("provides a native Amharic welcome without a hidden English-only note", () => {
    const html = renderToStaticMarkup(createElement(Amharic));
    expect(html).toContain("ይህ ገጽ የአማርኛ");
    expect(html).not.toContain("This page provides an Amharic welcome");
  });
  it("keeps the source catalog current across public pages and portal controls", () => {
    expect(
      execFileSync(
        process.execPath,
        ["scripts/update-translations.mjs", "--check"],
        { encoding: "utf8" },
      ),
    ).toContain("covers all extracted interface text");
  });
  it.each([
    "Faith",
    "Community",
    "Land & vision",
    "Calendar",
    "Rooted here.",
    "The entrance",
    "The garage",
    "View full calendar",
    "Estimated cost",
    "Read the announcement",
    "Your household profile",
    "Connect Google Calendar",
  ])("translates the redesigned interface: %s", (source) => {
    expect(translate(source, "am")).not.toBe(source);
    expect(translate(source, "am")).toMatch(/[\u1200-\u137f]/);
    expect(translate(source, "en")).toBe(source);
  });
  it("normalizes wrapping whitespace without stripping surrounding spacing", () => {
    expect(translate(" \n View full\n calendar  ", "am")).toBe(
      " \n " + catalog["View full calendar"] + "  ",
    );
  });
  it("translates known template wrappers and preserves interpolated values", () => {
    const custom = createTranslator({
      "Journal for {0} on {1}": "የ{0} መዝገብ በ{1}",
    });
    expect(custom("Journal for Family $1 on 2026-11-06", "am")).toBe(
      "የFamily $1 መዝገብ በ2026-11-06",
    );
    expect(translate("Site plan · sheet 3", "am")).toContain("3");
    expect(translate("Site plan · sheet 3", "am")).not.toContain("Site plan");
  });
  it("does not partially translate unknown personal text, addresses or references", () => {
    for (const source of [
      "Family Faith Smith",
      "727-731-9374",
      "support@haramonastery.org",
      "ZELLE-12345",
      "Private custom note from a member",
      "constructor",
      "toString",
    ]) {
      expect(translate(source, "am")).toBe(source);
    }
  });
  it("localizes Gregorian event dates without changing the time zone or calendar", () => {
    const ms = Date.parse("2026-11-07T01:00:00Z");
    expect(eventDate(ms, "en")).toContain(
      "Friday, November 6, 2026 at 7:00 PM",
    );
    expect(eventDate(ms, "am")).toMatch(/[\u1200-\u137f]/);
    expect(eventDate(ms, "am")).not.toMatch(/Friday|November|Central time/);
    expect(
      new Intl.DateTimeFormat(languageLocale("am"), {
        calendar: "gregory",
        year: "numeric",
        timeZone: "America/Chicago",
      }).format(ms),
    ).toContain("2026");
  });
});
