import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMotion } from "./Motion";
import { ArrowDown, ArrowRight } from "lucide-react";
const frames = [
  "choral-procession.jpg",
  "community-gathering.jpg",
  "pilgrims.jpg",
  "arch-mural.jpg",
  "assembly.jpg",
  "mountain-temple.jpg",
];
export function MediaProcession() {
  const root = useRef<HTMLElement>(null),
    { enabled } = useMotion();
  useGSAP(
    () => {
      if (!enabled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      gsap.fromTo(
        ".memory-ribbon",
        { xPercent: -8, rotationY: -7 },
        {
          xPercent: 5,
          rotationY: 5,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        },
      );
      gsap.fromTo(
        ".memory-film",
        { rotationY: -5, y: 25 },
        {
          rotationY: 0,
          y: -12,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        },
      );
    },
    { scope: root, dependencies: [enabled], revertOnUpdate: true },
  );
  return (
    <section
      ref={root}
      className="media-procession"
      aria-labelledby="memory-heading"
    >
      <div className="memory-backdrop" aria-hidden="true" />
      <div className="memory-intro">
        <span className="chapter-number">Life together</span>
        <h2 id="memory-heading">
          The life
          <br />
          <em>we share.</em>
        </h2>
        <p>
          Listen, remember, and walk
          <br />
          with the community.
        </p>
      </div>
      <figure className="memory-film">
        <video
          controls
          playsInline
          preload="none"
          poster="/assets/images/video-VID_20220607_230552_179.jpg"
          aria-label="Community film from the original 2022 collection"
        >
          <source
            src="/assets/videos/VID_20220607_230552_179.mp4"
            type="video/mp4"
          />
        </video>
        <figcaption>
          Original 2022 collection · sound plays only when you choose. Captions
          and a detailed description are not yet available.
        </figcaption>
      </figure>
      <nav className="memory-chapters" aria-label="Community journey">
        <a href="/faith">Prayer</a>
        <a href="#community" aria-current="location">
          Community
        </a>
        <a href="/monastery">The land</a>
        <a href="/members">For generations</a>
      </nav>
      <div className="memory-ribbon" aria-hidden="true">
        {frames.map((file) => (
          <img
            key={file}
            src={`/assets/images/${file}`}
            alt=""
            loading="lazy"
            width="240"
            height="160"
          />
        ))}
      </div>
      <a className="memory-continue" href="#shared-memory">
        Scroll to continue <ArrowDown size={18} />
      </a>
      <div className="memory-archive" id="shared-memory">
        <div>
          <span className="chapter-number">From our meeting archive</span>
          <h3>Our community’s shared memory.</h3>
          <p>
            Preserved recordings, photographs and stories. Historical imagery is
            not a record of completed Texas facilities.
          </p>
        </div>
        <a className="text-link" href="/archive">
          Listen to meeting recordings <ArrowRight size={19} />
        </a>
      </div>
    </section>
  );
}
