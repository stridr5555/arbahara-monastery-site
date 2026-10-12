import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
/** Lazy decorative WebGL. Factual content and controls remain accessible HTML. */
export default function LandScene({
  stop,
  future,
}: {
  stop: number;
  future: boolean;
}) {
  const mount = useRef<HTMLDivElement>(null),
    target = useRef({ stop, future });
  const [failed, setFailed] = useState(false);
  target.current = { stop, future };
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 1.8, 8);
    camera.lookAt(0, 0, 0);
    const group = new THREE.Group();
    scene.add(group);
    const curve = new THREE.CatmullRomCurve3(
      Array.from({ length: 100 }, (_, i) => {
        const t = (i / 99) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(t) * 3,
          Math.sin(t * 1.5) * 0.16 - 0.45,
          Math.sin(t) * 1.25,
        );
      }),
    );
    const geometry = new THREE.TubeGeometry(curve, 140, 0.012, 6, false),
      material = new THREE.MeshBasicMaterial({
        color: 0xba995d,
        transparent: true,
        opacity: 0.75,
      });
    group.add(new THREE.Mesh(geometry, material));
    const proposals = new THREE.Group();
    group.add(proposals);
    const wireMaterial = new THREE.LineBasicMaterial({
      color: 0xf0d398,
      transparent: true,
      opacity: 0.85,
    });
    const boxes = [
        new THREE.BoxGeometry(0.9, 0.35, 0.6),
        new THREE.BoxGeometry(1.3, 0.45, 0.45),
      ],
      edges = boxes.map((b) => new THREE.EdgesGeometry(b));
    edges.forEach((edge, i) => {
      const box = new THREE.LineSegments(edge, wireMaterial);
      box.position.set(i * 0.8 + 0.4, 0.05, -0.15 - i * 0.5);
      proposals.add(box);
    });
    const timer = new THREE.Timer();
    timer.connect(document);
    let frame = 0,
      active = true;
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const draw = () => {
      if (!active) return;
      timer.update();
      const time = timer.getElapsed();
      group.rotation.y = THREE.MathUtils.lerp(
        group.rotation.y,
        (target.current.stop - 1.5) * 0.08,
        0.035,
      );
      group.rotation.z = Math.sin(time * 0.15) * 0.015;
      proposals.visible = target.current.future;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    const visibility = () => {
      active = !document.hidden;
      cancelAnimationFrame(frame);
      if (active) draw();
    };
    document.addEventListener("visibilitychange", visibility);
    draw();
    const lost = (event: Event) => {
      event.preventDefault();
      active = false;
      cancelAnimationFrame(frame);
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      geometry.dispose();
      material.dispose();
      wireMaterial.dispose();
      boxes.forEach((b) => b.dispose());
      edges.forEach((e) => e.dispose());
      timer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return failed ? null : (
    <div className="land-webgl" ref={mount} aria-hidden="true" />
  );
}
