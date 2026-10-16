import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ConstructionBudget } from "../src/components/ConstructionBudget";
import {
  constructionDetails,
  constructionProjects,
  constructionSource,
  constructionTotal,
} from "../src/lib/construction";

describe("Illustrated service-readiness budget", () => {
  it("preserves every source estimate and the total", () => {
    expect(constructionDetails).toHaveLength(19);
    expect(constructionDetails.map((p) => [p.title, p.cost])).toEqual(
      constructionProjects,
    );
    expect(constructionTotal).toBe(1158250);
    expect(constructionSource).toContain(
      "1ar4FB1dn25miUdcNpG9LlaZytBXKm8j7G60_NEmKbS4",
    );
    expect(new Set(constructionDetails.map((p) => p.id)).size).toBe(19);
  });
  it.each(constructionDetails)(
    "provides a distinct large image, thumbnail and bilingual details for $title",
    (p) => {
      expect(p.amharic).toMatch(/[\u1200-\u137f]/);
      expect(p.description.length).toBeGreaterThan(70);
      expect(p.checks.length).toBeGreaterThan(50);
      for (const image of [p.image, p.thumbnail]) {
        expect(existsSync(`.${image}`)).toBe(true);
        expect(statSync(`.${image}`).size).toBeGreaterThan(1000);
      }
      expect(statSync(`.${p.thumbnail}`).size).toBeLessThan(30000);
    },
  );
  it("renders all project controls with only the first panel expanded", () => {
    const html = renderToStaticMarkup(createElement(ConstructionBudget));
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(18);
    expect(html.match(/role="region"/g)).toHaveLength(19);
    expect(html.match(/class="planning-panel"/g)).toHaveLength(1);
    for (const project of constructionDetails) {
      expect(html).toContain(`aria-controls="planning-panel-${project.id}"`);
      expect(html).toContain(project.amharic);
    }
    expect(html).toContain("Illustrative concept · not a completed project");
    expect(html).toContain("not approved specifications");
    expect(html).toContain("/donate?fund=construction");
  });
});
