import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Expand, Minus, Plus, X } from "lucide-react";
import {
  constructionDetails,
  constructionSource,
  constructionTotal,
  type ConstructionProject,
} from "../lib/construction";

const dollars = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

export function ConstructionBudget() {
  const [open, setOpen] = useState<string | null>(constructionDetails[0].id);
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
        <strong>{dollars(constructionTotal)}</strong>
        <p>19 estimated needs · not expenses incurred</p>
      </div>
      <p className="planning-instructions">
        Open a project for its picture and details. Select Enlarge image for a
        closer look.
      </p>
      <div className="planning-projects">
        {constructionDetails.map((project, index) => {
          const expanded = open === project.id;
          return (
            <article className="planning-project" key={project.id}>
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
                    <span lang="am" className="planning-amharic" translate="no">
                      {project.amharic}
                    </span>
                  </span>
                  <span className="planning-cost">
                    <small>Estimated cost</small>
                    {dollars(project.cost)}
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
                      <button
                        type="button"
                        className="planning-enlarge"
                        onClick={() => enlarge(project)}
                      >
                        <Expand size={16} /> Enlarge image
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <p className="planning-disclaimer">
        Estimates, bilingual project names and reference artwork come from the
        illustrated planning document. Images are regenerated concepts, not
        photographs of completed work. The explanatory details and planning
        checks are guidance for discussion, not approved specifications. These
        estimates are not bids or money raised. Work depends on funding,
        professional assessment and approvals; the permanent campus vision
        remains separate.
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
              <strong>{dollars(enlarged.cost)}</strong>
            </div>
            <p>Illustrative concept · not a completed project</p>
          </div>
        )}
      </dialog>
    </section>
  );
}
