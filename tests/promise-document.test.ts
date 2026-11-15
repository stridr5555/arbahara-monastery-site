import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { announcements, pageMeta } from "../src/content";
import { Announcements, PromiseAnnouncement } from "../src/pages/Announcements";
import { Gallery } from "../src/pages/Community";
import { Home } from "../src/pages/Home";

const slug = "promise-made-to-abuna-hara-dengeel";
const path = `/announcements/${slug}`;
const post = announcements.find((a) => a.slug === slug)!;
const asset = (src: string) => src.replace(/^\//, "");

describe("Promise Made to Abuna Hara Dengeel document", () => {
  it("is the latest announcement, with English and Amharic titles", () => {
    expect(announcements[0]).toBe(post);
    expect(post.title).toBe("Promise Made to Abuna Hara Dengeel");
    expect(post.amharicTitle).toContain("ለአቡነ ሐራ ድንግል የገባው ቃል ኪዳን");
    expect(pageMeta[path]).toBeDefined();
    expect(readFileSync("src/App.tsx", "utf8")).toContain(`case "${path}"`);
  });

  it("hosts the original PDF and a readable page image with the site", () => {
    const doc = post.document!;
    expect(existsSync(asset(doc.pdf))).toBe(true);
    expect(readFileSync(asset(doc.pdf)).subarray(0, 5).toString()).toBe(
      "%PDF-",
    );
    for (const image of [doc.image, doc.thumbnail]) {
      expect(existsSync(asset(image))).toBe(true);
      expect(statSync(asset(image)).size).toBeLessThan(400_000);
    }
    expect(doc.alt.length).toBeGreaterThan(20);
  });

  it("shows the document with download and open links on its page", () => {
    const html = renderToStaticMarkup(createElement(PromiseAnnouncement));
    expect(html).toContain(post.amharicTitle!);
    expect(html).toContain(`href="${post.document!.pdf}"`);
    expect(html).toContain("download=");
    expect(html).toContain("Download the PDF");
    expect(html).toContain(`src="${post.document!.image}"`);
    expect(html).toContain('lang="am"');
    expect(html).not.toContain("opacity:0");
  });

  it("is linked from the homepage, the announcements list and the gallery", () => {
    for (const component of [Home, Announcements, Gallery]) {
      expect(renderToStaticMarkup(createElement(component))).toContain(
        `href="${path}"`,
      );
    }
    expect(renderToStaticMarkup(createElement(Gallery))).toContain(
      'id="documents"',
    );
  });

  it("copies no contact details from the document onto the page", () => {
    const html = renderToStaticMarkup(createElement(PromiseAnnouncement));
    expect(html).not.toMatch(
      /moahara27|arbahara27|facebook\.com|haramonastery\.com/,
    );
  });
});
