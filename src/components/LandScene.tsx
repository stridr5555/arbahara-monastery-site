import { useEffect, useRef, useState, type RefObject } from "react";
import {
  mixPoint,
  smoothFlight,
  tourChapters,
  tourPose,
} from "../lib/landTour";
import type { createPropertyRenderer } from "../lib/propertyRenderer";

export default function LandScene({
  progress,
  stop,
  active,
  visible,
  motionEnabled,
  seekVersion,
  zoom,
}: {
  progress: RefObject<number>;
  stop: number;
  active: boolean;
  visible: boolean;
  motionEnabled: boolean;
  seekVersion: number;
  zoom: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<typeof createPropertyRenderer> | null>(null);
  const latest = useRef({ progress: progress.current, zoom });
  latest.current = { progress: progress.current, zoom };
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );
  const lastSeek = useRef(seekVersion);
  useEffect(() => {
    if (!visible || engine.current || status === "fallback") return;
    let cancelled = false;
    // Keep Three.js out of the initial page bundle, and load only near the tour.
    import("../lib/propertyRenderer")
      .then(({ createPropertyRenderer }) => {
        if (cancelled || !host.current) return;
        try {
          engine.current = createPropertyRenderer(host.current, () =>
            setStatus("fallback"),
          );
          engine.current.draw(
            tourPose(latest.current.progress, latest.current.zoom),
          );
          setStatus("ready");
        } catch {
          setStatus("fallback");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("fallback");
      });
    return () => {
      cancelled = true;
    };
  }, [visible, status]);
  useEffect(
    () => () => {
      engine.current?.dispose();
      engine.current = null;
    },
    [],
  );
  useEffect(() => {
    if (status === "fallback") {
      engine.current?.dispose();
      engine.current = null;
    }
  }, [status]);
  useEffect(() => {
    if (status !== "ready" || !visible || !engine.current) return;
    let frame = 0;
    const from = engine.current.snapshot();
    const fly = lastSeek.current !== seekVersion && motionEnabled && !active;
    lastSeek.current = seekVersion;
    let elapsed = 0,
      previous = 0;
    const draw = (now: number) => {
      if (!engine.current) return;
      if (!document.hidden) {
        const destination = tourPose(progress.current, zoom);
        elapsed += previous ? Math.min(100, now - previous) : 0;
        previous = now;
        const t = fly ? smoothFlight(elapsed / 2200) : 1;
        engine.current.draw({
          position: mixPoint(from.position, destination.position, t),
          target: mixPoint(from.target, destination.target, t),
        });
        if (host.current)
          host.current.dataset.cameraProgress = progress.current.toFixed(5);
        if (active || t < 1) frame = requestAnimationFrame(draw);
      } else {
        previous = 0;
        frame = requestAnimationFrame(draw);
      }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, visible, motionEnabled, progress, seekVersion, zoom, status]);
  return (
    <div className="diorama-scene property-flight" data-renderer={status}>
      <div className="property-canvas" ref={host} hidden={status !== "ready"} />
      {status !== "ready" ? (
        <div className="property-fallback">
          <img
            className="diorama-art"
            src="/assets/images/land-illustration-accurate.webp"
            width="1536"
            height="1024"
            alt="Illustration of the wooded property, residence southwest of the lake and drive leading to the eastern road. Not a survey."
          />
          <p role="status">
            {status === "loading"
              ? "Preparing the 3D property…"
              : "3D is unavailable on this device. Explore the chapter descriptions below or view the original photographs."}
          </p>
        </div>
      ) : null}
      <div className="property-flight-label">
        <span>
          {String(stop + 1).padStart(2, "0")} /{" "}
          {String(tourChapters.length).padStart(2, "0")}
        </span>{" "}
        {tourChapters[stop].name}
        <small>
          {!motionEnabled
            ? "Choose any place · motion is off"
            : active
              ? "Guided flight · pauses at each feature"
              : "Select a place or press Play tour"}
        </small>
      </div>
    </div>
  );
}
