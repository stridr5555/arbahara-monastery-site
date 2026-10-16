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
  highPriorityTotals,
} from "../lib/constructionEstimates";

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
        <p>2026 preliminary establishment estimates · Crandall, Texas · USD</p>
      </div>
      <aside className="estimate-priority" aria-labelledby="priority-heading">
        <span className="priority-badge">High priority</span>
        <h3 id="priority-heading">Six needs to move the monastery forward</h3>
        <div className="estimate-totals">
          <div>
            <span>Normalized total</span>
            <strong>{dollars(highPriorityTotals.normalized)}</strong>
          </div>
          <div>
            <span>Economical total</span>
            <strong>{dollars(highPriorityTotals.economical)}</strong>
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
      <div className="estimate-overview">
        <h3>All 19 projects</h3>
        <div className="estimate-totals">
          <div>
            <span>Normalized total</span>
            <strong>{dollars(estimateTotals.normalized)}</strong>
          </div>
          <div>
            <span>Economical total</span>
            <strong>{dollars(estimateTotals.economical)}</strong>
          </div>
        </div>
        <p>
          <strong>Economical:</strong> a lower-cost target using basic finishes,
          coordinated procurement and the project-specific savings below.{" "}
          <strong>Normalized:</strong> typical paid-labor and material
          allowances. Both include 10% contingency; neither is a guaranteed
          price or maximum.
        </p>
        <p>
          Prepared October 15, 2026. These are modeled planning estimates
          informed by published benchmarks—not contractor bids, actual expenses,
          an approved budget or money raised. Building sizes and site quantities
          below are assumptions, not measured plans.
        </p>
      </div>
      <div className="estimate-table-wrap">
        <table className="estimate-table">
          <caption>
            Project estimates at a glance · includes each project's contingency
          </caption>
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Normalized</th>
              <th scope="col">Economical</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const e = constructionEstimates.find((e) => e.id === project.id)!;
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
                      {project.title}
                    </a>
                    {e.highPriority && (
                      <span className="priority-badge">High priority</span>
                    )}
                  </th>
                  <td>{dollars(e.normalizedTotal.total)}</td>
                  <td>{dollars(e.economicalTotal.total)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">All 19 projects</th>
              <td>{dollars(estimateTotals.normalized)}</td>
              <td>{dollars(estimateTotals.economical)}</td>
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
                    <span>{project.title}</span>
                    {estimate.highPriority && (
                      <span className="priority-badge">High priority</span>
                    )}
                    <span lang="am" className="planning-amharic" translate="no">
                      {project.amharic}
                    </span>
                  </span>
                  <span className="planning-cost">
                    <small>Normalized</small>
                    {dollars(estimate.normalizedTotal.total)}
                    <small>Economical</small>
                    {dollars(estimate.economicalTotal.total)}
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
                      </figcaption>
                    </figure>
                    <div className="planning-description">
                      <h4>{project.lead}</h4>
                      <p>{project.description}</p>
                      <h5>Planning checks</h5>
                      <p>{project.checks}</p>
                      <h5>Assumed scope & quantity</h5>
                      <p>{estimate.scope}</p>
                      <h5>Economical option — what changes</h5>
                      <p>{estimate.savings}</p>
                      <h5>Not included / confirm before funding</h5>
                      <p>{estimate.exclusions}</p>
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
                                {dollars(estimate.normalizedTotal.contingency)}
                              </td>
                              <td>
                                {dollars(estimate.economicalTotal.contingency)}
                              </td>
                            </tr>
                          </tbody>
                          <tfoot>
                            <tr>
                              <th scope="row">Project total</th>
                              <td>{dollars(estimate.normalizedTotal.total)}</td>
                              <td>{dollars(estimate.economicalTotal.total)}</td>
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
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div className="estimate-methodology">
        <h3>Read these figures with their assumptions</h3>
        <p>
          Each row is a modeled allowance, not a supplier's itemized quote.
          Labor includes paid crews and equipment operation; overhead and margin
          are separately allocated. No free volunteer labor or nonprofit
          sales-tax exemption is assumed. Tax allowances are provisional.
        </p>
        <p>
          Contingency is calculated on each base subtotal and rounded to the
          nearest $100. Totals add those project amounts; no second site-wide
          contingency is added. Figures are in 2026 dollars with no allowance
          for later-year escalation.
        </p>
        <p>
          Land purchase, financing, permanent church construction and ongoing
          operations are excluded. Existing property and proposed construction
          remain separate. The initial septic and well are counted once; the
          dormitory contains only its additional utility-upgrade allowance.
          Confirm whether the liturgy temple and prayer house are distinct
          facilities or alternative solutions before committing to both.
        </p>
        <p>
          The original illustrated document totals {dollars(constructionTotal)}.
          That historical reference has not been rewritten; it is not the
          current 2026 estimate. The assumed 12,000-square-foot, 40-room
          finished dormitory is the largest reason the new total is higher.
        </p>
        <p>
          Confidence is preliminary and lowest for unmeasured site work, custom
          features and unconfirmed building sizes. Before adopting a fundraising
          target, obtain a measured site plan, building/occupancy program, soil
          and water studies, and comparable local written bids. Final code,
          accessibility, fire, water and wastewater requirements may change
          these figures substantially.
        </p>
      </div>
      <p className="planning-disclaimer">
        Project names and reference artwork come from the illustrated planning
        document; the 2026 estimates above are new modeled allowances. Images
        are regenerated concepts, not photographs of completed work. The
        explanatory details and planning checks are guidance for discussion, not
        approved specifications. These estimates are not bids or money raised.
        Work depends on funding, professional assessment and approvals; the
        permanent campus vision remains separate.
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
