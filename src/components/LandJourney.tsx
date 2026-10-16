import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useMotion } from "./Motion";
import {
  advanceTour,
  chapterProgress,
  tourChapter,
  tourChapters,
} from "../lib/landTour";
import { establishmentBudgetTotal } from "../lib/establishmentBudget";
import { ConstructionBudget } from "./ConstructionBudget";
import LandScene from "./LandScene";
const dollars = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
export function LandJourney({ full = false }: { full?: boolean }) {
  const [stop, setStop] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [seekVersion, setSeekVersion] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
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
    if (!visible || !enabled || !playing) return;
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
  }, [visible, enabled, playing]);
  const goTo = (next: number) => {
    progress.current = chapterProgress(next);
    setZoom(1);
    setStop(tourChapter(progress.current));
    setPlaying(false);
    setEnded(false);
    setSeekVersion((version) => version + 1);
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
      className={`land-journey diorama-tour flyover-tour ${full ? "full" : ""}`}
      id="land"
      data-stop={stop}
    >
      <div
        className="land-stage"
        ref={root}
        data-playing={playing && enabled && visible}
      >
        <LandScene
          progress={progress}
          stop={stop}
          active={visible && enabled && playing}
          visible={visible}
          motionEnabled={enabled}
          seekVersion={seekVersion}
          zoom={zoom}
        />
        <header className="land-heading">
          <h2>
            Rooted here.
            <br />
            For generations.
          </h2>
          <p>
            Ten acres in Crandall, Texas.
            <br />A place to gather, serve and grow.
          </p>
        </header>
        <div className="land-mode">
          <div
            className="calendar-switch"
            role="group"
            aria-label="Property view"
          >
            <button aria-pressed="true" onClick={() => goTo(0)}>
              Existing property
            </button>
            <a href={full ? "#project-budget" : "/monastery#project-budget"}>
              Future plans <ArrowRight size={14} />
            </a>
          </div>
          <p>
            Explore the residence, lake and wooded grounds. Choose a place, or
            let the guided tour lead you.
          </p>
        </div>
        <div className="photo-tour-console diorama-console">
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
                  setSeekVersion((version) => version + 1);
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
              disabled={stop === tourChapters.length - 1}
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
                <span aria-hidden="true">{i + 1}</span>
                <span>{s.name}</span>
              </button>
            ))}
          </nav>
          <div
            className="property-zoom"
            role="group"
            aria-label="Inspect the model"
          >
            <button onClick={() => goTo(0)}>
              <RotateCcw size={15} /> Return to overview
            </button>
            <button
              disabled={zoom >= 1.4}
              onClick={() => {
                setPlaying(false);
                setZoom((z) => Math.min(1.4, z + 0.15));
                setSeekVersion((v) => v + 1);
              }}
            >
              <ZoomOut size={17} /> Wider
            </button>
            <button
              disabled={zoom <= 0.65}
              onClick={() => {
                setPlaying(false);
                setZoom((z) => Math.max(0.65, z - 0.15));
                setSeekVersion((v) => v + 1);
              }}
            >
              <ZoomIn size={17} /> Closer
            </button>
          </div>
        </div>
      </div>
      <aside className="land-budget tour-budget-strip" id="future">
        <h3>Preparing for service</h3>
        <div>
          <strong>{dollars(establishmentBudgetTotal)}</strong>
          <p>
            Overall establishment budget · all 19 projects · reduced and staged
            scope
          </p>
        </div>
        <a
          className="text-link"
          href={full ? "#project-budget" : "/monastery#project-budget"}
        >
          Explore all 19 projects <ArrowRight size={17} />
        </a>
      </aside>
      <div className="diorama-caption">
        <p
          className="photo-tour-caption"
          aria-live={playing && enabled ? "off" : "polite"}
        >
          {tourChapters[stop].text}
        </p>
        <p className="photo-tour-note">
          {!enabled
            ? "Animations are off. You can still view every chapter using the buttons above. "
            : "Photo-informed 3D reconstruction · "}
          Not a surveyed model or drone recording.{" "}
          <a href="/gallery#property-photographs">
            See all original photographs
          </a>
          .
        </p>
        <p className="photo-tour-note">
          Buildings, trees, shoreline and entrance are modeled approximations,
          not photogrammetry or measured architectural drawings. Proposed
          buildings are not shown as completed. Original photographs remain the
          source of truth.
        </p>
      </div>
      {full ? (
        <section
          className="property-reference wrap"
          aria-label="Actual property aerial photographs"
        >
          <div className="section-heading">
            <div>
              <h2>The actual land</h2>
              <p>Compare the tour with the original aerial photographs.</p>
            </div>
            <a
              className="text-link"
              href="https://www.realtor.com/realestateandhomes-detail/7029-FM-2757_Crandall_TX_75114_M97693-63657"
              target="_blank"
              rel="noreferrer"
            >
              View Realtor listing <ArrowRight size={17} />
            </a>
          </div>
          <div className="property-reference-images">
            <figure>
              <a
                href="/assets/property/user-map-overhead.jpg"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src="/assets/property/user-map-overhead.jpg"
                  width="480"
                  height="270"
                  loading="lazy"
                  alt="Actual overhead aerial: the residence and nearby garage southwest of the irregular pond; the drive curves from the eastern road around the pond"
                />
              </a>
              <figcaption>
                Overhead reference · used to trace the pond, drive and building
                positions.
              </figcaption>
            </figure>
            <figure>
              <a
                href="/assets/property/user-map-oblique.jpg"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src="/assets/property/user-map-oblique.jpg"
                  width="480"
                  height="270"
                  loading="lazy"
                  alt="Actual oblique aerial showing the residence, garage, wooded grounds, lake and curving driveway"
                />
              </a>
              <figcaption>
                Oblique reference · the real buildings and wooded setting.
              </figcaption>
            </figure>
          </div>
          <p className="small">
            The tour is an illustrative reconstruction from these photographs,
            not Realtor’s captured 3D model. Aerial images show surrounding land
            as context, not surveyed ownership boundaries.
          </p>
        </section>
      ) : null}
      {full ? <ConstructionBudget /> : null}
    </section>
  );
}
