import { useEffect, useRef, useState } from "react";
import {
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { LinkButton, Cross } from "./Layout";
import { site } from "../content";
import { useMotion } from "./Motion";
export const originalHeroImages = [
  {
    src: "/assets/images/jesus-icon.png",
    alt: "Icon of Christ from the monastery’s original website",
    caption:
      "In the name of the Father, and of the Son, and of the Holy Spirit, one God.",
  },
  {
    src: "/assets/images/saint-portrait.jpg",
    alt: "Sacred portrait from the monastery’s original collection",
    caption:
      "A life rooted in prayer, worship, and the communion of the Church.",
  },
  {
    src: "/assets/images/view-terrace.jpg",
    alt: "Terrace view preserved from the monastery’s original collection",
    caption: "A place of stillness, hospitality, and spiritual renewal.",
  },
  {
    src: "/assets/images/flowers.jpg",
    alt: "Flowers from the monastery’s original collection",
    caption:
      "With gratitude for God’s gifts, and care for those who come after us.",
  },
];
export function SacredHero() {
  const root = useRef<HTMLElement>(null);
  const { enabled } = useMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [interacting, setInteracting] = useState(false);
  useEffect(() => {
    const handler = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && !document.hidden),
      { threshold: 0.05 },
    );
    if (root.current) observer.observe(root.current);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handler);
    };
  }, []);
  useEffect(() => {
    if (!enabled || paused || !visible || interacting) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % originalHeroImages.length),
      8000,
    );
    return () => clearInterval(timer);
  }, [enabled, paused, visible, interacting]);
  useGSAP(
    () => {
      if (!enabled) return;
      gsap.from(".sacred-hero-copy > *", {
        y: 24,
        opacity: 0,
        duration: 0.85,
        stagger: 0.11,
        ease: "power2.out",
      });
    },
    { scope: root, dependencies: [enabled], revertOnUpdate: true },
  );
  const select = (n: number) => {
    setIndex((n + originalHeroImages.length) % originalHeroImages.length);
    setPaused(true);
  };
  return (
    <section
      className={`sacred-hero ${paused || !enabled || !visible || interacting ? "is-paused" : ""}`}
      ref={root}
      aria-roledescription="carousel"
      aria-label="Monastery sacred image collection"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false);
      }}
    >
      <div className="sacred-hero-slides">
        {originalHeroImages.map((image, i) => (
          <div
            key={image.src}
            className={`sacred-slide ${i === index ? "active" : ""}`}
            aria-hidden={i !== index}
          >
            <img
              src={image.src}
              alt={image.alt}
              fetchPriority={i === 0 ? "high" : undefined}
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>
      <div className="hero-votive-light" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="sacred-hero-inner wrap">
        <div className="sacred-hero-copy">
          <Cross />
          <p className="hero-faith-name">{site.faith}</p>
          <h1>
            Monastery of
            <br />
            <em>Abuna Hara Dengeel</em>
          </h1>
          <p>
            A sanctuary for prayer, divine worship, and the life of our
            spiritual family. Together, we are building a lasting home for our
            faith in Crandall, Texas.
          </p>
          <div className="actions">
            <LinkButton href="/donate">Help build our monastery</LinkButton>
            <LinkButton href="/visit" secondary>
              Visit & worship
            </LinkButton>
          </div>
          <a href="#vision" className="hero-story-link">
            Our story continues <ArrowDown size={16} />
          </a>
        </div>
      </div>
      <div className="sacred-hero-bottom wrap">
        <p aria-live={paused ? "polite" : "off"}>
          {originalHeroImages[index].caption}
        </p>
        <div className="hero-controls">
          <button
            type="button"
            onClick={() => select(index - 1)}
            aria-label="Previous hero image"
          >
            <ChevronLeft size={18} />
          </button>
          {originalHeroImages.map((image, i) => (
            <button
              key={image.src}
              type="button"
              className={`hero-dot ${i === index ? "active" : ""}`}
              aria-label={`Show hero image ${i + 1}: ${image.alt}`}
              aria-pressed={i === index}
              onClick={() => select(i)}
            >
              <span />
            </button>
          ))}
          <button
            type="button"
            onClick={() => select(index + 1)}
            aria-label="Next hero image"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            onClick={() => setPaused(!paused)}
            disabled={!enabled}
            aria-label={paused ? "Play hero slideshow" : "Pause hero slideshow"}
          >
            {paused || !enabled ? <Play size={16} /> : <Pause size={16} />}
          </button>
        </div>
      </div>
    </section>
  );
}
