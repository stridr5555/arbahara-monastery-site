import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ConstructionBudget } from "../src/components/ConstructionBudget";
import {
  establishmentBudget,
  establishmentBudgetTarget,
  establishmentBudgetTotal,
  establishmentReserve,
  priorityBudgetTotal,
} from "../src/lib/establishmentBudget";
import {
  constructionEstimates,
  estimateTotals,
  highPriorityIds,
  highPriorityTotals,
  scenarioTotal,
} from "../src/lib/constructionEstimates";
import {
  constructionDetails,
  constructionProjects,
  constructionSource,
  constructionTotal,
} from "../src/lib/construction";

describe("Illustrated service-readiness budget", () => {
  it("allocates exactly $900,000 across all 19, with reserve included rather than added", () => {
    expect(establishmentBudget.map((p) => p.id)).toEqual(
      constructionDetails.map((p) => p.id),
    );
    expect(establishmentBudgetTotal).toBe(establishmentBudgetTarget);
    expect(establishmentBudgetTotal).toBe(900000);
    expect(establishmentReserve).toBe(90000);
    expect(priorityBudgetTotal).toBe(515000);
    expect(establishmentBudget.filter((p) => p.highPriority)).toHaveLength(6);
    for (const project of establishmentBudget) {
      expect(project.amounts).toHaveLength(6);
      expect(project.reserve).toBe(project.allocation * 0.1);
      expect(
        project.amounts.every(
          (amount) => Number.isInteger(amount) && amount > 0,
        ),
      ).toBe(true);
      expect(project.scope.length).toBeGreaterThan(60);
      expect(project.deferred.length).toBeGreaterThan(60);
    }
    expect(
      establishmentBudget.find((p) => p.id === "temporary-dormitory")?.deferred,
    ).toContain("does not build 40 finished rooms");
    expect(
      establishmentBudget.find((p) => p.id === "temporary-liturgy-temple")
        ?.scope,
    ).toContain("existing garage");
  });
  it("estimates all 19 projects with economical options below normalized, without duplicating contingency", () => {
    expect(constructionEstimates.map((p) => p.id)).toEqual(
      constructionDetails.map((p) => p.id),
    );
    for (const p of constructionEstimates) {
      expect(p.normalized).toHaveLength(5);
      expect(p.economical).toHaveLength(5);
      expect(p.economicalTotal.total).toBeLessThan(p.normalizedTotal.total);
      expect(p.normalizedTotal).toEqual(scenarioTotal(p.normalized, 0.1));
      expect(p.economicalTotal).toEqual(scenarioTotal(p.economical, 0.1));
      expect(p.sources.length).toBeGreaterThan(0);
      expect(p.savings.length).toBeGreaterThan(60);
    }
    expect(highPriorityIds).toHaveLength(6);
    expect(constructionEstimates.filter((p) => p.highPriority)).toHaveLength(6);
    expect(highPriorityTotals.normalized).toBe(986500);
    expect(highPriorityTotals.economical).toBe(814400);
    expect(estimateTotals).toEqual({
      normalized: 3590100,
      economical: 2968200,
    });
    expect(estimateTotals.economical).toBe(
      constructionEstimates.reduce((s, p) => s + p.economicalTotal.total, 0),
    );
    expect(estimateTotals.normalized).toBe(
      constructionEstimates.reduce((s, p) => s + p.normalizedTotal.total, 0),
    );
    expect(scenarioTotal([12345], 0.1)).toEqual({
      subtotal: 12345,
      contingency: 1200,
      total: 13545,
    });
  });
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
      expect(html).toContain(
        establishmentBudget.find((p) => p.id === project.id)?.amharic ??
          project.amharic,
      );
    }
    expect(html).toContain("Illustrative concept · not a completed project");
    expect(html).toContain("not approved specifications");
    expect(html).toContain("/donate?fund=construction");
    expect(html).toContain("High priority");
    expect(html).toContain("allocation breakdown");
    expect(html).toContain("Earlier full-scope estimates — reference only");
    expect(html).toContain("$900,000");
    expect(html).toContain("$515,000");
    expect(html).toContain("2026 cost breakdown");
    expect(html).not.toContain("planning-hover-preview");
    expect(html).not.toContain("Conservative");
    expect(html).toContain(
      'id="planning-toggle-entrance-road-parking" aria-expanded="true"',
    );
    expect(html).not.toContain("Hover over a picture");
  });
});
