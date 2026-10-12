import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useMotion } from "./Motion";
import {
  constructionProjects,
  constructionSource,
  constructionTotal,
} from "../lib/construction";
const LandScene = lazy(() => import("./LandScene"));
const dollars = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const stops = [
  {
    name: "Land",
    text: "Ten acres in Crandall, Texas. A place to gather, serve and grow.",
  },
  {
    name: "Prayer",
    text: "An existing residence and garage offer a beginning. Preparation for congregational prayer remains subject to professional review and the Church’s guidance.",
  },
  {
    name: "Water",
    text: "Care for the existing lake, and assess a proposed aquifer well. Drilling, safety and sacred use require the appropriate permissions and ecclesiastical guidance.",
  },
  {
    name: "Hospitality",
    text: "A temporary dormitory is part of the service-readiness proposal. It is a future concept, not a completed building.",
  },
];
export function LandJourney({ full = false }: { full?: boolean }) {
  const [future, setFuture] = useState(false),
    [stop, setStop] = useState(0),
    [visible, setVisible] = useState(false);
  const root = useRef<HTMLElement>(null);
  const { enabled } = useMotion();
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "150px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <section
      ref={root}
      className={`land-journey ${full ? "full" : ""}`}
      id="land"
      data-stop={stop}
    >
      <div className="land-stage">
        <img
          className="land-illustration"
          src="/assets/images/land-illustration.webp"
          width="1536"
          height="1024"
          loading="lazy"
          alt="Illustrative cutaway reconstruction of the existing property, based on its aerial photograph; not a survey"
        />
        {visible && enabled ? (
          <Suspense fallback={null}>
            <LandScene stop={stop} future={future} />
          </Suspense>
        ) : null}
        <div className="land-heading">
          <h2>
            Rooted here.
            <br />
            For generations.
          </h2>
          <p aria-live="polite">{stops[stop].text}</p>
        </div>
        <div className="land-mode">
          <div className="calendar-switch">
            <button aria-pressed={!future} onClick={() => setFuture(false)}>
              Existing property
            </button>
            <button aria-pressed={future} onClick={() => setFuture(true)}>
              Future vision
            </button>
          </div>
          <p>
            {future
              ? "Proposed massing only. No buildings shown are approved construction drawings."
              : "Illustrative reconstruction. Explore the original property photographs below."}
          </p>
        </div>
        {future ? (
          <div className="proposed-callout">
            Future prayer and hospitality spaces
            <br />
            <small>Conceptual positions, not surveyed locations</small>
          </div>
        ) : null}
        <aside className="land-budget" id="future">
          <h3>Preparing for service</h3>
          <strong>{dollars(constructionTotal)}</strong>
          <p>estimated need</p>
          <dl>
            <div>
              <dt>Temporary liturgy temple</dt>
              <dd>$350,000</dd>
            </div>
            <div>
              <dt>40-room temporary dormitory</dt>
              <dd>$400,000</dd>
            </div>
          </dl>
          <a
            className="text-link"
            href={full ? "#project-budget" : "/monastery#project-budget"}
          >
            Explore all 19 projects <ArrowRight size={17} />
          </a>
        </aside>
        <div className="land-tour-controls" aria-label="Property tour chapters">
          <span>Guided tour</span>
          {stops.map((s, i) => (
            <button
              key={s.name}
              aria-pressed={stop === i}
              onClick={() => setStop(i)}
            >
              {s.name}
            </button>
          ))}
          <a href="/gallery">
            Original photographs <ArrowRight size={15} />
          </a>
        </div>
      </div>
      <p className="land-disclaimer">
        Illustrative reconstruction from photographs and plans, not a measured
        survey. Proposed structures are conceptual.{" "}
        <a
          href="/assets/property/user-map-overhead.jpg"
          target="_blank"
          rel="noreferrer"
        >
          View original aerial image
        </a>
        .
      </p>
      {full ? (
        <section className="construction-budget wrap" id="project-budget">
          <div className="section-heading">
            <div>
              <span className="section-label">Service-readiness proposal</span>
              <h2>
                A faithful plan.
                <br />
                An open account.
              </h2>
            </div>
            <div>
              <strong>{dollars(constructionTotal)}</strong>
              <p>19 estimated needs · not expenses incurred</p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <caption>
                Monastery service-readiness estimates from the supplied budget
              </caption>
              <thead>
                <tr>
                  <th>Project</th>
                  <th className="numeric">Estimated cost</th>
                </tr>
              </thead>
              <tbody>
                {constructionProjects.map(([name, cost]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td className="numeric">{dollars(cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Total estimated need</th>
                  <th className="numeric">{dollars(constructionTotal)}</th>
                </tr>
              </tfoot>
            </table>
          </div>
          <p>
            These are estimates from the monastery’s planning document, not
            bids, money raised or completed work. All work depends on design,
            funding, professional assessment and approvals. The permanent campus
            vision is separate from these temporary service-readiness needs.
          </p>
          <a
            className="text-link"
            href={constructionSource}
            target="_blank"
            rel="noreferrer"
          >
            Read the supplied budget <ArrowRight size={17} />
          </a>
          <a className="button" href="/donate?fund=construction">
            Support the vision <ArrowRight size={17} />
          </a>
        </section>
      ) : null}
    </section>
  );
}
