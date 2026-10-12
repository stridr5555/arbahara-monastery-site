import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import { useMotion } from "./Motion";
import { advanceTour, tourChapter, tourChapters } from "../lib/landTour";
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
export function LandJourney({ full = false }: { full?: boolean }) {
  const [stop, setStop] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [sceneStatus, setSceneStatus] = useState<
    "loading" | "ready" | "fallback"
  >("loading");
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const scrubber = useRef<HTMLInputElement>(null);
  const { enabled } = useMotion();
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || !enabled || !playing || sceneStatus === "loading") return;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      if (!document.hidden) {
        progress.current = advanceTour(
          progress.current,
          last ? (now - last) / 1000 : 0,
        );
        if (scrubber.current) scrubber.current.value = String(progress.current);
        setStop((old) => {
          const next = tourChapter(progress.current);
          return old === next ? old : next;
        });
        if (progress.current >= 1) {
          setPlaying(false);
          setEnded(true);
          return;
        }
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, enabled, playing, sceneStatus]);
  const goTo = (next: number) => {
    progress.current = Math.min(3, Math.max(0, next)) / 4;
    setStop(tourChapter(progress.current));
    setPlaying(false);
    setEnded(false);
    if (scrubber.current) scrubber.current.value = String(progress.current);
  };
  const toggle = () => {
    if (ended) {
      progress.current = 0;
      setStop(0);
      setEnded(false);
    }
    setPlaying(ended || !playing);
  };
  return (
    <section
      ref={root}
      className={`land-journey photo-tour ${full ? "full" : ""}`}
      id="land"
      data-stop={stop}
    >
      <header className="photo-tour-heading">
        <h2>Walk the land.</h2>
        <p>A guided journey through our Crandall property.</p>
      </header>
      <div
        className="photo-tour-stage"
        data-scene={visible && enabled ? sceneStatus : "fallback"}
      >
        <img
          className="photo-tour-fallback"
          src={tourChapters[stop].image}
          loading="lazy"
          alt={tourChapters[stop].alt}
        />
        {visible && enabled ? (
          <Suspense fallback={null}>
            <LandScene progress={progress} onStatus={setSceneStatus} />
          </Suspense>
        ) : null}
        <span className="photo-tour-location">
          {stop === 3
            ? "Future campus · concept only"
            : "Crandall, Texas · original property photographs"}
        </span>
      </div>
      <div className="photo-tour-console">
        <div className="photo-tour-playback">
          <button className="tour-play" onClick={toggle} disabled={!enabled}>
            {ended ? (
              <RotateCcw size={23} />
            ) : playing && enabled ? (
              <Pause size={23} />
            ) : (
              <Play size={23} />
            )}
            {ended
              ? "Replay tour"
              : playing && enabled
                ? "Pause tour"
                : "Play tour"}
          </button>
          <label className="tour-scrubber">
            Tour progress
            <input
              ref={scrubber}
              type="range"
              min="0"
              max="1"
              step="0.001"
              defaultValue="0"
              aria-label="Tour progress"
              onChange={(e) => {
                progress.current = Number(e.target.value);
                setStop(tourChapter(progress.current));
                setPlaying(false);
                setEnded(progress.current >= 1);
              }}
            />
          </label>
          <button
            aria-label="Previous tour chapter"
            onClick={() => goTo(stop - 1)}
            disabled={stop === 0}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            aria-label="Next tour chapter"
            onClick={() => goTo(stop + 1)}
            disabled={stop === 3}
          >
            <ChevronRight size={24} />
          </button>
        </div>
        <nav
          className="photo-tour-chapters"
          aria-label="Property tour chapters"
        >
          {tourChapters.map((s, i) => (
            <button
              key={s.name}
              aria-pressed={stop === i}
              onClick={() => goTo(i)}
            >
              {i + 1} {s.name}
            </button>
          ))}
        </nav>
        <p
          className="photo-tour-caption"
          aria-live={playing && enabled ? "off" : "polite"}
        >
          {tourChapters[stop].text}
        </p>
        <p className="photo-tour-note">
          {!enabled
            ? "Animations are off. You can still view every chapter using the buttons above. "
            : sceneStatus === "fallback"
              ? "Showing photographs: the 3D view is unavailable on this device. "
              : "Photo-based 3D animation · "}
          Not a surveyed model or drone recording.{" "}
          <a href="/gallery#property-photographs">
            See all original photographs
          </a>
          .
        </p>
        <aside className="photo-tour-budget" id="future">
          <h3>Preparing for service</h3>
          <p>
            <strong>{dollars(constructionTotal)}</strong> estimated need
          </p>
          <a
            className="text-link"
            href={full ? "#project-budget" : "/monastery#project-budget"}
          >
            Explore all 19 projects <ArrowRight size={17} />
          </a>
        </aside>
      </div>
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
