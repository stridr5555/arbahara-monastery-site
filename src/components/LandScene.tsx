import { useEffect, useRef, type RefObject } from "react";
import { ArrowUpRight, Camera } from "lucide-react";
import { tourChapters, tourPose } from "../lib/landTour";

const anchors = [
  { left: "44%", top: "64%" },
  { left: "33%", top: "49%" },
  { left: "54%", top: "31%" },
  { left: "63%", top: "60%" },
];

/** The original illustrated diorama, with perspective motion and lifted gallery photographs.
 * This is deliberately not presented as photogrammetry or surveyed 3D geometry. */
export default function LandScene({
  progress,
  stop,
  active,
  motionEnabled,
  seekVersion,
  onSelect,
  onPhoto,
}: {
  progress: RefObject<number>;
  stop: number;
  active: boolean;
  motionEnabled: boolean;
  seekVersion: number;
  onSelect: (chapter: number) => void;
  onPhoto: (chapter: number) => void;
}) {
  const world = useRef<HTMLDivElement>(null);
  const photograph = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    let previous = -1;
    const draw = () => {
      if (
        world.current &&
        photograph.current &&
        previous !== progress.current
      ) {
        previous = progress.current;
        const pose = tourPose(previous);
        world.current.style.transform = motionEnabled
          ? `translate3d(${pose.x}%, ${pose.y}%, 0) rotateX(${pose.pitch}deg) rotateY(${pose.yaw}deg) scale(${pose.scale})`
          : "none";
        world.current.dataset.cameraProgress = previous.toFixed(5);
        photograph.current.style.transform = motionEnabled
          ? `perspective(1000px) translate3d(0, ${(1 - pose.photoLift) * 70}px, ${pose.photoLift * 60}px) rotateY(${pose.photoYaw}deg) rotateX(${(1 - pose.photoLift) * 12}deg) scale(${0.75 + pose.photoLift * 0.25})`
          : "none";
        photograph.current.dataset.photoProgress = previous.toFixed(5);
      }
      if (active) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [active, motionEnabled, progress, stop, seekVersion]);
  return (
    <div className="diorama-scene">
      <div className="diorama-world" ref={world}>
        <img
          className="diorama-art"
          src="/assets/images/land-illustration-accurate.webp"
          width="1536"
          height="1024"
          alt="Game-like cutaway illustration of the wooded Crandall property: residence and garage to the southwest of the lake, driveway leading to the road on the east. Illustrative, not a property boundary survey."
        />
        {anchors.map((anchor, i) => (
          <button
            key={tourChapters[i].name}
            className="diorama-hotspot"
            style={anchor}
            aria-label={`Show ${tourChapters[i].name.toLowerCase()}`}
            aria-pressed={stop === i}
            onClick={() => onSelect(i)}
          >
            <Camera size={17} />
          </button>
        ))}
      </div>
      <div className="diorama-photo" ref={photograph}>
        {tourChapters.map((chapter, i) => (
          <figure key={chapter.name} hidden={stop !== i}>
            <button
              onClick={() => onPhoto(i)}
              aria-label={`Enlarge ${chapter.name.toLowerCase()} photograph${i === 3 ? " (future concept)" : ""}`}
            >
              <img
                src={chapter.image}
                alt={chapter.alt}
                loading={i === stop ? "eager" : "lazy"}
                width="480"
                height="270"
              />
              <span>
                <span>
                  {i === 3
                    ? "Future campus · concept only"
                    : "From our property photographs"}
                </span>
                <ArrowUpRight size={19} />
              </span>
            </button>
            <figcaption>
              {chapter.name}
              <span>Click photo to enlarge</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
