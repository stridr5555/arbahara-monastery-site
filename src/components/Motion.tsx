import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
const MotionContext = createContext({ enabled: false, toggle: () => {} });
export function MotionProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      let saved = "";
      try {
        saved = localStorage.getItem("arbahara-motion") || "";
      } catch {}
      setEnabled(!media.matches && saved !== "off");
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = enabled ? "on" : "off";
  }, [enabled]);
  return (
    <MotionContext.Provider
      value={{
        enabled,
        toggle: () =>
          setEnabled((old) => {
            try {
              localStorage.setItem("arbahara-motion", old ? "off" : "on");
            } catch {}
            return !old;
          }),
      }}
    >
      {children}
    </MotionContext.Provider>
  );
}
export function useMotion() {
  return useContext(MotionContext);
}
export function MotionToggle() {
  const { enabled, toggle } = useMotion();
  return (
    <button
      className="motion-toggle"
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
    >
      Animations {enabled ? "on" : "off"}
    </button>
  );
}
export function usePageMotion(root: RefObject<HTMLDivElement | null>) {
  const { enabled } = useMotion();
  useGSAP(
    () => {
      if (!enabled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const context = gsap.matchMedia();
      context.add("(prefers-reduced-motion: no-preference)", () => {
        const sections = root.current!.querySelectorAll(
          ".section,.welcome-strip,.callout,.page-intro,.faith-intro,.gallery-memory",
        );
        sections.forEach((section) => {
          const targets = section.querySelectorAll(
            "h2,h3,.section-label,.lead,.text-link,.phase-number",
          );
          if (targets.length)
            gsap.from(targets, {
              opacity: 0,
              y: 22,
              duration: 0.7,
              stagger: 0.065,
              ease: "power2.out",
              scrollTrigger: { trigger: section, start: "top 88%", once: true },
            });
        });
        const steps = root.current!.querySelectorAll(
          ".phase-preview li,.phase-list li",
        );
        steps.forEach((step) =>
          gsap.from(step, {
            y: 30,
            opacity: 0,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: { trigger: step, start: "top 90%", once: true },
          }),
        );
        const progress = root.current!.querySelector(".reading-progress");
        if (progress)
          gsap.fromTo(
            progress,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: "none",
              scrollTrigger: {
                trigger: root.current,
                start: "top top",
                end: "bottom bottom",
                scrub: 0.2,
              },
            },
          );
        const story = root.current!.querySelector(".faith-story-line");
        if (story)
          gsap.fromTo(
            story,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: "none",
              scrollTrigger: {
                trigger: story.parentElement,
                start: "top 70%",
                end: "bottom 65%",
                scrub: 0.7,
              },
            },
          );
        if (
          window.matchMedia("(min-width: 900px) and (pointer: fine)").matches
        ) {
          root
            .current!.querySelectorAll<HTMLElement>("[data-depth]")
            .forEach((frame) =>
              gsap.fromTo(
                frame,
                { rotationY: -5, rotationX: 2, y: 20 },
                {
                  rotationY: 0,
                  rotationX: 0,
                  y: -15,
                  ease: "none",
                  scrollTrigger: {
                    trigger: frame,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1,
                  },
                },
              ),
            );
        }
        let active = true;
        const refreshLayout = () => ScrollTrigger.refresh();
        window.addEventListener("arbahara-layout-change", refreshLayout);
        document.fonts.ready.then(() => {
          if (active) ScrollTrigger.refresh();
        });
        return () => {
          active = false;
          window.removeEventListener("arbahara-layout-change", refreshLayout);
        };
      });
      return () => context.revert();
    },
    { scope: root, dependencies: [enabled], revertOnUpdate: true },
  );
}
export function DepthFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { enabled } = useMotion();
  const quick = useRef<{
    x: ReturnType<typeof gsap.quickTo>;
    y: ReturnType<typeof gsap.quickTo>;
  } | null>(null);
  useGSAP(
    () => {
      if (enabled && ref.current)
        quick.current = {
          x: gsap.quickTo(ref.current, "rotationX", {
            duration: 0.55,
            ease: "power2.out",
          }),
          y: gsap.quickTo(ref.current, "rotationY", {
            duration: 0.55,
            ease: "power2.out",
          }),
        };
      return () => {
        quick.current = null;
      };
    },
    { scope: ref, dependencies: [enabled], revertOnUpdate: true },
  );
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !enabled ||
      event.pointerType !== "mouse" ||
      !ref.current ||
      !quick.current
    )
      return;
    const rect = ref.current.getBoundingClientRect();
    quick.current.y(
      ((event.clientX - rect.left - rect.width / 2) / rect.width) * 5,
    );
    quick.current.x(
      (-(event.clientY - rect.top - rect.height / 2) / rect.height) * 4,
    );
  };
  const leave = () => {
    quick.current?.x(0);
    quick.current?.y(0);
  };
  return (
    <div
      className={`depth-frame ${className}`}
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      {children}
    </div>
  );
}
