import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { announcements, pageMeta } from "../src/content";
import {
  Announcements,
  FoundingAnnouncement,
  GrandOpeningAnnouncement,
} from "../src/pages/Announcements";
import { Home } from "../src/pages/Home";
describe("Grand Opening announcement", () => {
  const post = announcements.find((a) => a.slug === "grand-opening-ceremony")!;
  it("publishes the owner’s report without inventing an event date", () => {
    expect(announcements[0]).toBe(post);
    expect(post.displayDate).toBe("Published October 27, 2026");
    expect(post.paragraphs.join(" ")).toContain("About 50 people");
    expect(post.paragraphs.join(" ")).toContain("$50,000");
    expect(post.paragraphs.join(" ")).toContain("blessed the feast");
    expect(post.paragraphs.join(" ")).toContain(
      "Israel’s journey before entering the Promised Land",
    );
  });
  it("displays each of the seven supplied photographs exactly once, with captions and accessible alternatives", () => {
    const html = renderToStaticMarkup(createElement(GrandOpeningAnnouncement));
    expect(post.photos).toHaveLength(7);
    expect(new Set(post.photos!.map((p) => p.src)).size).toBe(7);
    for (const photo of post.photos!) {
      expect(existsSync(`assets/${photo.src.split("/assets/")[1]}`)).toBe(true);
      expect(photo.alt.length).toBeGreaterThan(20);
      expect(photo.caption.length).toBeGreaterThan(20);
      expect(html.split(`src="${photo.src}"`).length - 1).toBe(1);
    }
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('fetchPriority="high"');
  });
  it("keeps the founding letter attached to its original article", () => {
    const html = renderToStaticMarkup(createElement(FoundingAnnouncement));
    expect(html).toContain("A new sanctuary for our spiritual family");
    expect(html).toContain("ten-acre property");
    expect(html).not.toContain("$50,000");
  });
  it("links the newest post from the homepage and lists both announcements", () => {
    expect(renderToStaticMarkup(createElement(Home))).toContain(
      "/announcements/grand-opening-ceremony",
    );
    const list = renderToStaticMarkup(createElement(Announcements));
    expect(list).toContain("/announcements/grand-opening-ceremony");
    expect(list).toContain(
      "/announcements/establishment-of-abuna-hara-dengeel-monastery",
    );
    expect(pageMeta["/announcements/grand-opening-ceremony"]).toBeDefined();
    expect(readFileSync("src/App.tsx", "utf8")).toContain(
      'case "/announcements/grand-opening-ceremony"',
    );
  });
});
