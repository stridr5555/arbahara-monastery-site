import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Sms } from "../src/pages/Sms";
import { SmsChoices } from "../src/portal/SmsPreferences";
import { Privacy, Terms } from "../src/pages/Information";
describe("Public SMS evidence", () => {
  it("shows both disclosures without login, with unchecked optional choices and working policy targets", () => {
    const html = renderToStaticMarkup(createElement(Sms));
    const checkboxes = html.match(/<input[^>]*type="checkbox"[^>]*>/g) || [];
    expect(checkboxes).toHaveLength(2);
    checkboxes.forEach(input => {
      expect(input).not.toMatch(/\bchecked(?:=|\s|>)/);
      expect(input).not.toMatch(/\brequired(?:=|\s|>)/);
    });
    expect(html).toContain("Membership and meeting notices");
    expect(html).toContain("Donation and fundraising reminders");
    expect(html).toContain("Text messaging is not active");
    expect(html).toContain("469-212-6370");
    expect(html).not.toContain("214-803-1347");
    expect(html).not.toContain("SMS enrollment is closed");
    expect(html).not.toContain("when enrollment opens");
    expect(renderToStaticMarkup(createElement<{ collecting: boolean }>(SmsChoices, { collecting: false }))).toContain("SMS enrollment is closed");
    expect(html).toContain("services remain available without SMS consent");
    expect(html).toContain('href="/privacy"');
    const terms = renderToStaticMarkup(createElement(Terms));
    for (const category of ["informational", "fundraising"]) {
      expect(html).toContain(`href="/terms#sms-${category}"`);
      expect(terms).toContain(`id="sms-${category}"`);
    }
    expect(renderToStaticMarkup(createElement(Privacy))).toContain("exact disclosure and its version");
  });
});
