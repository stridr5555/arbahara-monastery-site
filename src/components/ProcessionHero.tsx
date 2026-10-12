import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Pause, Play } from "lucide-react";
import { useMotion } from "./Motion";
export function ProcessionHero() {
  const root = useRef<HTMLElement>(null);
  const { enabled, toggle } = useMotion();
  useGSAP(
    () => {
      if (!enabled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      gsap
        .timeline({
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        })
        .to(".journey-textile", { yPercent: 14, scale: 1.07, ease: "none" }, 0)
        .to(
          ".journey-icon",
          { yPercent: -12, rotateY: -7, rotateZ: 1, ease: "none" },
          0,
        )
        .to(".procession-copy", { y: 80, ease: "none" }, 0);
    },
    { scope: root, dependencies: [enabled], revertOnUpdate: true },
  );
  return (
    <section
      className="procession-hero"
      ref={root}
      id="faith"
      aria-labelledby="journey-heading"
    >
      <img
        className="journey-textile"
        src="/assets/images/journey-textile.webp"
        width="1536"
        height="1024"
        alt=""
        fetchPriority="high"
      />
      <figure className="journey-icon">
        <img
          src="/assets/images/saint-portrait.jpg"
          width="701"
          height="1024"
          alt="Sacred portrait from the monastery’s existing Ethiopian Orthodox collection"
          fetchPriority="high"
        />
      </figure>
      <div className="procession-copy">
        <h1 id="journey-heading">
          Faith,
          <br />
          <span>carried forward.</span>
        </h1>
        <p>
          A living home of prayer, community and hope.
          <br />
          Monastery of Abuna Hara Dengeel · Crandall, Texas.
        </p>
        <div className="actions">
          <a className="button" href="#community">
            Begin the journey <ArrowRight size={18} />
          </a>
          <a className="button secondary" href="/members">
            Member home
          </a>
        </div>
      </div>
      <nav className="chapter-rail" aria-label="Journey chapters">
        {[
          ["faith", "Faith"],
          ["community", "Community"],
          ["land", "Land"],
          ["future", "Future"],
        ].map(([id, label], i) => (
          <a href={`#${id}`} key={id}>
            <span>0{i + 1}</span>
            {label}
          </a>
        ))}
      </nav>
      <div className="journey-controls">
        <button onClick={toggle} aria-pressed={enabled}>
          {enabled ? <Pause size={15} /> : <Play size={15} />}
          <span>{enabled ? "Pause motion" : "Motion off"}</span>
        </button>
        <a href="#participate">
          Skip journey <ArrowRight size={16} />
        </a>
      </div>
      <a className="journey-next" href="#community">
        <span>
          02
          <br />
          Community
        </span>
        <ArrowRight size={24} />
      </a>
    </section>
  );
}
