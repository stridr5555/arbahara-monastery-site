import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Expand, Minus, Plus, X } from "lucide-react";
import {
  constructionDetails,
  constructionSource,
  constructionTotal,
  type ConstructionProject,
} from "../lib/construction";
import {
  constructionEstimates,
  costCategories,
  estimateSources,
  estimateTotals,
  highPriorityIds,
} from "../lib/constructionEstimates";
import {
  allocationCategories,
  establishmentBudgetById,
  establishmentBudgetTotal,
  establishmentReserve,
  priorityBudgetTotal,
} from "../lib/establishmentBudget";

const projects = [...constructionDetails].sort((a, b) => {
  const rank = (id: string) => {
    const n = (highPriorityIds as readonly string[]).indexOf(id);
    return n < 0 ? 99 : n;
  };
  return rank(a.id) - rank(b.id);
});

const dollars = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

export function ConstructionBudget() {
  const [open, setOpen] = useState<string | null>(projects[0].id);
  const [enlarged, setEnlarged] = useState<ConstructionProject | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  function enlarge(project: ConstructionProject) {
    setEnlarged(project);
  }
  useEffect(() => {
    const node = dialog.current;
    if (!enlarged || !node) return;
    const previousOverflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [enlarged]);

  return (
    <section
      className="construction-budget planning-budget wrap"
      id="project-budget"
      aria-labelledby="planning-heading"
    >
      <div className="planning-heading">
        <h2 id="planning-heading">A faithful plan. An open account.</h2>
        <p>2026 establishment budget · Crandall, Texas · USD</p>
      </div>
      <div className="estimate-overview establishment-target">
        <span>Overall budget · all 19 projects</span>
        <strong>{dollars(establishmentBudgetTotal)}</strong>
        <h3>A practical beginning, within one shared budget.</h3>
        <p>
          The owner-directed funding ceiling is $900,000 across all 19 projects.
          Each allocation below is part of that total—not an additional request.
          The plan favors adapting existing space, modest purchases and staged
          work.
        </p>
        <div className="estimate-totals">
          <div>
            <span>Planned work & procurement</span>
            <strong>
              {dollars(establishmentBudgetTotal - establishmentReserve)}
            </strong>
          </div>
          <div>
            <span>Protected reserve · included</span>
            <strong>{dollars(establishmentReserve)}</strong>
          </div>
        </div>
        <p>
          This is a funding plan, not a contractor estimate or a promise to
          complete every original design. The garage adaptation replaces the
          new-hall assumption; the 40-room dormitory begins with feasibility and
          limited first-stage accommodation. Further rooms and other deferred
          scope need later funding.
        </p>
      </div>
      <aside className="estimate-priority" aria-labelledby="priority-heading">
        <span className="priority-badge">High priority</span>
        <h3 id="priority-heading">Six needs to move the monastery forward</h3>
        <div className="estimate-totals">
          <div>
            <span>Six high-priority allocations</span>
            <strong>{dollars(priorityBudgetTotal)}</strong>
          </div>
          <div>
            <span>Other 13 allocations</span>
            <strong>
              {dollars(establishmentBudgetTotal - priorityBudgetTotal)}
            </strong>
          </div>
        </div>
        <p>
          Road, parking and gate · Septic · Bathrooms · Liturgy temple ·
          Relocation of two priests · Temporary prayer house
        </p>
        <p>
          Priority is a fundraising sequence, not permission to open. Fire
          protection, safe water and other required work may also be
          prerequisites.
        </p>
      </aside>
      <div className="estimate-table-wrap">
        <table className="estimate-table">
          <caption>
            All 19 allocations · reserve included · total $900,000
          </caption>
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Budget allocation</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const e = constructionEstimates.find((e) => e.id === project.id)!;
              const budget = establishmentBudgetById.get(project.id)!;
              return (
                <tr
                  key={project.id}
                  className={
                    e.highPriority ? "estimate-priority-row" : undefined
                  }
                >
                  <th scope="row">
                    <a
                      href={`#planning-toggle-${project.id}`}
                      onClick={() => setOpen(project.id)}
                    >
                      {budget.title ?? project.title}
                    </a>
                    {e.highPriority && (
                      <span className="priority-badge">High priority</span>
                    )}
                    <small className="allocation-stage">{budget.stage}</small>
                  </th>
                  <td>{dollars(budget.allocation)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">All 19 projects</th>
              <td>{dollars(establishmentBudgetTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="planning-instructions">
        Open a project for its picture and details. Select Enlarge image for a
        closer look.
      </p>
      <div className="planning-projects">
        {projects.map((project, index) => {
          const expanded = open === project.id;
          const estimate = constructionEstimates.find(
            (e) => e.id === project.id,
          )!;
          const budget = establishmentBudgetById.get(project.id)!;
          return (
            <article
              className={`planning-project${estimate.highPriority ? " planning-high-priority" : ""}`}
              key={project.id}
            >
              <h3 className="planning-project-heading">
                <button
                  type="button"
                  className="planning-toggle"
                  id={`planning-toggle-${project.id}`}
                  aria-expanded={expanded}
                  aria-controls={`planning-panel-${project.id}`}
                  onClick={() => {
                    setOpen(expanded ? null : project.id);
                  }}
                >
                  <span className="planning-thumbnail">
                    <img
                      src={project.thumbnail}
                      alt=""
                      width="240"
                      height="160"
                      loading="lazy"
                    />
                  </span>
                  <span className="planning-number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="planning-titles">
                    <span>{budget.title ?? project.title}</span>
                    {estimate.highPriority && (
                      <span className="priority-badge">High priority</span>
                    )}
                    <span lang="am" className="planning-amharic" translate="no">
                      {budget.amharic ?? project.amharic}
                    </span>
                  </span>
                  <span className="planning-cost">
                    <small>Budget allocation</small>
                    {dollars(budget.allocation)}
                    <small>{budget.stage}</small>
                  </span>
                  {expanded ? (
                    <Minus size={20} aria-hidden="true" />
                  ) : (
                    <Plus size={20} aria-hidden="true" />
                  )}
                </button>
              </h3>
              <div
                id={`planning-panel-${project.id}`}
                role="region"
                aria-labelledby={`planning-toggle-${project.id}`}
                hidden={!expanded}
              >
                {expanded && (
                  <div className="planning-panel">
                    <figure>
                      <button
                        type="button"
                        className="planning-image-button"
                        aria-label="Enlarge project image"
                        onClick={() => enlarge(project)}
                      >
                        <img
                          src={project.image}
                          alt={project.title}
                          width="1536"
                          height="1024"
                          loading="lazy"
                        />
                        <span className="planning-image-hint">
                          <Expand size={16} /> Enlarge image
                        </span>
                      </button>
                      <figcaption>
                        Illustrative concept · not a completed project
                        <br />
                        Concept may show a broader future design, not the funded
                        scope below.
                      </figcaption>
                    </figure>
                    <div className="planning-description">
                      <h4>{project.lead}</h4>
                      <h5>Planning checks</h5>
                      <p>{project.checks}</p>
                      <h5>What this allocation is intended to fund</h5>
                      <p>{budget.scope}</p>
                      <h5>Deferred scope & conditions</h5>
                      <p>{budget.deferred}</p>
                      <button
                        type="button"
                        className="planning-enlarge"
                        onClick={() => enlarge(project)}
                      >
                        <Expand size={16} /> Enlarge image
                      </button>
                    </div>
                    <div className="estimate-breakdown">
                      <div className="estimate-table-wrap">
                        <table className="estimate-table allocation-table">
                          <caption>
                            {budget.title ?? project.title} — allocation
                            breakdown (USD)
                          </caption>
                          <thead>
                            <tr>
                              <th scope="col">Funding category</th>
                              <th scope="col">Allocation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allocationCategories.map((category, i) => (
                              <tr key={category}>
                                <th scope="row">
                                  {project.id === "priests-relocation"
                                    ? [
                                        "Furnishings",
                                        "Legal & document services",
                                        "Travel & baggage",
                                        "Filing / consular startup allowance",
                                        "Initial settling support",
                                        "Protected reserve · 10% of allocation",
                                      ][i]
                                    : category}
                                </th>
                                <td>{dollars(budget.amounts[i])}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <th scope="row">
                                Included in the $900,000 budget
                              </th>
                              <td>{dollars(budget.allocation)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <p>
                        These are spending allocations for the reduced or staged
                        scope, not quoted component prices. Reserve is already
                        included. Obtain comparable written bids before
                        committing; reduce or defer optional scope if the
                        allowance cannot cover compliant work.
                      </p>
                      <details className="allocation-reference">
                        <summary>
                          Earlier full-scope estimates — reference only
                        </summary>
                        <p>
                          The comparison below prices a different, broader scope
                          and is not added to the $900,000 plan.
                        </p>
                        <h5>Earlier assumed scope</h5>
                        <p>{estimate.scope}</p>
                        <h5>Earlier economical option</h5>
                        <p>{estimate.savings}</p>
                        <p>{estimate.exclusions}</p>
                        <div className="estimate-table-wrap">
                          <table className="estimate-table">
                            <caption>
                              {project.title} — 2026 cost breakdown (USD)
                            </caption>
                            <thead>
                              <tr>
                                <th scope="col">Cost element</th>
                                <th scope="col">Normalized</th>
                                <th scope="col">Economical</th>
                              </tr>
                            </thead>
                            <tbody>
                              {costCategories.map((category, i) => (
                                <tr key={category}>
                                  <th scope="row">
                                    {project.id === "priests-relocation"
                                      ? [
                                          "Furnishings",
                                          "Legal & document services",
                                          "Travel & baggage",
                                          "Filing / consular startup allowance",
                                          "First 60 days settling support",
                                        ][i]
                                      : category}
                                  </th>
                                  <td>{dollars(estimate.normalized[i])}</td>
                                  <td>{dollars(estimate.economical[i])}</td>
                                </tr>
                              ))}
                              <tr>
                                <th scope="row">Base subtotal</th>
                                <td>
                                  {dollars(estimate.normalizedTotal.subtotal)}
                                </td>
                                <td>
                                  {dollars(estimate.economicalTotal.subtotal)}
                                </td>
                              </tr>
                              <tr>
                                <th scope="row">
                                  Contingency · 10% in both options
                                </th>
                                <td>
                                  {dollars(
                                    estimate.normalizedTotal.contingency,
                                  )}
                                </td>
                                <td>
                                  {dollars(
                                    estimate.economicalTotal.contingency,
                                  )}
                                </td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr>
                                <th scope="row">Project total</th>
                                <td>
                                  {dollars(estimate.normalizedTotal.total)}
                                </td>
                                <td>
                                  {dollars(estimate.economicalTotal.total)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        <h5>How this allowance was built</h5>
                        <p>{estimate.basis}</p>
                        <ul className="estimate-sources">
                          {estimate.sources.map((key) => (
                            <li key={key}>
                              <a
                                href={estimateSources[key].url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {estimateSources[key].label}
                              </a>
                              <p>{estimateSources[key].note}</p>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div className="estimate-methodology">
        <h3>How the $900,000 plan works</h3>
        <p>
          All 19 allocations add to $900,000. Each holds 10% of its allocation
          as protected reserve: $90,000 in total, leaving $810,000 for planned
          work and procurement. Do not add this reserve again. Category splits
          are proposed spending limits, not measured quantities or supplier
          quotations; they do not authorize purchases or construction.
        </p>
        <p>
          The earlier full-scope estimates remain available inside each project
          for transparency: economical {dollars(estimateTotals.economical)} and
          normalized {dollars(estimateTotals.normalized)} for all 19. Those
          scenarios include 10% contingency on their base costs and do not
          represent the reduced $900,000 scope. A smaller budget does not make
          the original buildings cheaper.
        </p>
        <p>
          Land purchase, financing, permanent church construction and ongoing
          operations are excluded. Existing property and proposed construction
          remain separate. Coordinate the initial septic, well and later
          accommodation utilities to avoid duplicate work. Keep the small
          prayer-area adaptation distinct from the garage project. No free
          labor, donated materials, grant awards or tax exemption is assumed as
          secured.
        </p>
        <p>
          The original illustrated document totals {dollars(constructionTotal)}.
          That historical reference has not been rewritten. The $900,000 target
          is a new owner-directed allocation plan, not a revision of that
          document or certification that its original scope can be completed for
          less.
        </p>
        <p>
          Confidence is preliminary and lowest for unmeasured site work, custom
          features and unconfirmed building sizes. Before committing funds,
          obtain a measured site plan, building/occupancy program, soil and
          water studies, and comparable local written bids. Final code,
          accessibility, fire, water and wastewater requirements may change the
          affordable scope substantially. Keep safety and required professional
          work intact; defer optional quantities rather than exceed the ceiling.
          Report overruns and seek a revised plan before making commitments.
        </p>
      </div>
      <p className="planning-disclaimer">
        Project names and reference artwork come from the illustrated planning
        document; the allocations above are a funding plan, not verified
        construction costs. Images are regenerated concepts, not photographs of
        completed work. The explanatory details and planning checks are guidance
        for discussion, not approved specifications. These estimates are not
        bids or money raised. Work depends on funding, professional assessment
        and approvals; the permanent campus vision remains separate.
      </p>
      <div className="planning-footer">
        <a
          className="text-link"
          href={constructionSource}
          target="_blank"
          rel="noreferrer"
        >
          <BookOpen size={18} /> Read the illustrated budget
        </a>
        <a className="button" href="/donate?fund=construction">
          Support the vision <ArrowRight size={17} />
        </a>
      </div>
      <dialog
        className="planning-lightbox"
        ref={dialog}
        aria-labelledby="planning-lightbox-title"
        onCancel={() => setEnlarged(null)}
        onClose={() => setEnlarged(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setEnlarged(null);
        }}
      >
        {enlarged && (
          <div className="planning-lightbox-content">
            <button
              type="button"
              className="planning-lightbox-close"
              aria-label="Close enlarged image"
              autoFocus
              onClick={() => setEnlarged(null)}
            >
              <X size={24} />
            </button>
            <img
              src={enlarged.image}
              alt={enlarged.title}
              width="1536"
              height="1024"
            />
            <div className="planning-lightbox-caption">
              <div>
                <h3 id="planning-lightbox-title">{enlarged.title}</h3>
                <p lang="am" translate="no">
                  {enlarged.amharic}
                </p>
              </div>
              <strong>Illustrative concept</strong>
            </div>
            <p>Illustrative concept · not a completed project</p>
          </div>
        )}
      </dialog>
    </section>
  );
}
