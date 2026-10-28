import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMotion } from "./Motion";

/** Progressive enhancement: the server-rendered article is always readable. */
export function useAnnouncementMotion(root: RefObject<HTMLDivElement | null>) {
  const { enabled } = useMotion();
  useGSAP(
    () => {
      if (!enabled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const page = root.current!;
        gsap.from(
          page.querySelectorAll(
            ".announcement-post > header > :not(.announcement-motion-control), .announcements-page-heading > *",
          ),
          {
            y: 22,
            opacity: 0,
            duration: 0.85,
            stagger: 0.09,
            ease: "power3.out",
          },
        );
        page
          .querySelectorAll(
            ".announcement-card, .ceremony-opening > div > p, .ceremony-milestones > div, .ceremony-story > *, .announcement-letter > *, .ceremony-photographs > :not(.ceremony-photo-grid), .announcement-response",
          )
          .forEach((element) => {
            gsap.from(element, {
              y: 26,
              opacity: 0,
              duration: 0.75,
              ease: "power2.out",
              scrollTrigger: { trigger: element, start: "top 94%", once: true },
            });
          });
        const hero = page.querySelector(".ceremony-opening figure");
        if (hero)
          gsap.from(hero, {
            y: 34,
            rotation: -1.5,
            opacity: 0,
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: { trigger: hero, start: "top 94%", once: true },
          });
        page
          .querySelectorAll(".ceremony-photo-grid figure")
          .forEach((photo, index) => {
            gsap.from(photo, {
              y: 48,
              rotationX: 7,
              rotationZ: index % 2 ? 1.2 : -1.2,
              opacity: 0,
              duration: 1,
              delay: (index % 3) * 0.1,
              ease: "power3.out",
              scrollTrigger: { trigger: photo, start: "top 96%", once: true },
            });
            const image = photo.querySelector("img");
            if (image)
              gsap.from(image, {
                scale: 1.035,
                duration: 1.6,
                ease: "power2.out",
                scrollTrigger: { trigger: photo, start: "top 96%", once: true },
              });
          });
        const progress = page.querySelector(".announcement-progress");
        if (progress)
          gsap.fromTo(
            progress,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: "none",
              scrollTrigger: {
                trigger: page,
                start: "top top",
                end: "bottom bottom",
                scrub: 0.25,
              },
            },
          );
        // Native image dimensions reserve space; refresh after fonts or lazy images settle.
        let active = true;
        const refresh = () => ScrollTrigger.refresh();
        page
          .querySelectorAll("img")
          .forEach((image) => image.addEventListener("load", refresh));
        document.fonts.ready.then(() => {
          if (active) refresh();
        });
        return () => {
          active = false;
          page
            .querySelectorAll("img")
            .forEach((image) => image.removeEventListener("load", refresh));
        };
      });
      return () => media.revert();
    },
    { scope: root, dependencies: [enabled], revertOnUpdate: true },
  );
}
